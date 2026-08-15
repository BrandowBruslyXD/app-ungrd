using ConectaRiesgoAI.Api.Common.Auth;
using ConectaRiesgoAI.Api.Common.Errors;
using ConectaRiesgoAI.Api.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ConectaRiesgoAI.Api.Features.Auth.Login;

/// <summary>
/// Valida credenciales contra el hash guardado. El mensaje de error nunca dice cuál de los
/// dos datos falló: decirlo le regala a un atacante qué correos existen en el sistema.
/// </summary>
public class LoginHandler(AppDbContext db, IGeneradorTokenJwt generadorToken)
    : IRequestHandler<LoginCommand, LoginResponse>
{
    private const string MensajeCredencialesInvalidas = "Correo o contraseña incorrectos";

    public async Task<LoginResponse> Handle(LoginCommand command, CancellationToken cancellationToken)
    {
        var email = command.Email.Trim().ToLowerInvariant();
        var usuario = await db.Usuarios.SingleOrDefaultAsync(u => u.Email == email, cancellationToken);

        if (usuario is null || !BCrypt.Net.BCrypt.Verify(command.Password, usuario.PasswordHash))
        {
            throw new CredencialesInvalidasException(MensajeCredencialesInvalidas);
        }

        var token = generadorToken.Generar(usuario);
        return new LoginResponse(token, UsuarioDto.DeEntidad(usuario));
    }
}
