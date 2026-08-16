using ConectaRiesgoAI.Api.Common.Auth;
using ConectaRiesgoAI.Api.Common.Errors;
using ConectaRiesgoAI.Api.Domain.Entities;
using ConectaRiesgoAI.Api.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ConectaRiesgoAI.Api.Features.Auth.Login;

/// <summary>
/// Valida credenciales contra el hash guardado. El mensaje de error nunca dice cuál de los
/// dos datos falló: decirlo le regala a un atacante qué correos existen en el sistema.
/// </summary>
public class LoginHandler(AppDbContext db, IGeneradorTokenJwt generadorToken, ILogger<LoginHandler> logger)
    : IRequestHandler<LoginCommand, LoginResponse>
{
    private const string MensajeCredencialesInvalidas = "Correo o contraseña incorrectos";

    // Un hash cualquiera contra el que verificar cuando el correo no existe. Sin esto, un login a
    // un correo inexistente responde antes que uno a un correo real con contraseña incorrecta
    // (ese sí corre BCrypt.Verify): la diferencia de tiempo le dice a quien ataca qué correos existen.
    private static readonly string HashSenuelo = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString());

    public async Task<LoginResponse> Handle(LoginCommand command, CancellationToken cancellationToken)
    {
        string email = command.Email.Trim().ToLowerInvariant();
        Usuario? usuario = await db.Usuarios.SingleOrDefaultAsync(u => u.Email == email, cancellationToken);

        bool credencialesValidas = BCrypt.Net.BCrypt.Verify(command.Password, usuario?.PasswordHash ?? HashSenuelo);
        if (usuario is null || !credencialesValidas)
        {
            logger.LogWarning("Intento de login fallido para {Email}", email);
            throw new CredencialesInvalidasException(MensajeCredencialesInvalidas);
        }

        string token = generadorToken.Generar(usuario);
        return new LoginResponse(token, UsuarioDto.DeEntidad(usuario));
    }
}
