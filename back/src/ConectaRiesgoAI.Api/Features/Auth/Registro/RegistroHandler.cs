using ConectaRiesgoAI.Api.Common.Auth;
using ConectaRiesgoAI.Api.Domain.Entities;
using ConectaRiesgoAI.Api.Domain.Enums;
using ConectaRiesgoAI.Api.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace ConectaRiesgoAI.Api.Features.Auth.Registro;

/// <summary>
/// Crea un usuario con rol Ciudadano y le devuelve el token de una vez: no hace falta loguearse
/// después de registrarse.
/// </summary>
public class RegistroHandler(AppDbContext db, IGeneradorTokenJwt generadorToken, ILogger<RegistroHandler> logger)
    : IRequestHandler<RegistroCommand, RegistroResponse>
{
    public async Task<RegistroResponse> Handle(RegistroCommand command, CancellationToken cancellationToken)
    {
        string email = command.Email.Trim().ToLowerInvariant();

        bool yaExiste = await db.Usuarios.AnyAsync(u => u.Email == email, cancellationToken);
        if (yaExiste)
        {
            throw new InvalidOperationException("El correo ya está registrado");
        }

        Usuario usuario = new()
        {
            Nombre = command.Nombre.Trim(),
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(command.Password),
            Rol = Rol.Ciudadano,
            Municipio = command.Municipio.Trim()
        };

        db.Usuarios.Add(usuario);

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (ViolaElIndiceUnicoDeEmail(ex))
        {
            // Dos registros concurrentes con el mismo correo pasan el AnyAsync de arriba antes
            // de que ninguno haya guardado; el índice único de Email es la última barrera.
            // Cualquier otro DbUpdateException (Postgres caído, otra restricción) no entra aquí:
            // sigue de largo hasta ManejadorGlobalDeErrores, que sí lo loguea como 500.
            throw new InvalidOperationException("El correo ya está registrado");
        }

        logger.LogInformation("Nuevo registro: {Email}", email);

        string token = generadorToken.Generar(usuario);
        return new RegistroResponse(token, UsuarioDto.DeEntidad(usuario));
    }

    /// <summary>Distingue la carrera de dos registros con el mismo correo de cualquier otro fallo de guardado.</summary>
    private static bool ViolaElIndiceUnicoDeEmail(DbUpdateException ex) =>
        ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation };
}
