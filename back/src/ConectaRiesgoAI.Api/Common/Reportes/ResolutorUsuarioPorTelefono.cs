using ConectaRiesgoAI.Api.Domain.Entities;
using ConectaRiesgoAI.Api.Domain.Enums;
using ConectaRiesgoAI.Api.Persistence;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace ConectaRiesgoAI.Api.Common.Reportes;

/// <inheritdoc cref="IResolutorUsuarioPorTelefono" />
public class ResolutorUsuarioPorTelefono(AppDbContext db, ILogger<ResolutorUsuarioPorTelefono> logger)
    : IResolutorUsuarioPorTelefono
{
    /// <inheritdoc />
    public async Task<Usuario> ResolverOCrearAsync(
        string telefono,
        CanalOrigen canalOrigen,
        string nombreContacto,
        string municipio,
        CancellationToken cancellationToken)
    {
        string telefonoNormalizado = telefono.Trim();

        Usuario? existente = await db.Usuarios
            .FirstOrDefaultAsync(u => u.Telefono == telefonoNormalizado, cancellationToken);

        if (existente is not null)
        {
            logger.LogDebug("Usuario resuelto por identificador de canal {IdentificadorCanal}", telefonoNormalizado);
            return existente;
        }

        Usuario nuevo = new()
        {
            Nombre = nombreContacto.Trim(),
            Email = $"wa-{telefonoNormalizado}@ingesta.conectariesgoai.local",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString("N")),
            Municipio = municipio.Trim(),
            Telefono = telefonoNormalizado,
            OrigenRegistro = canalOrigen
        };

        db.Usuarios.Add(nuevo);

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (ViolaElIndiceUnicoDeTelefono(ex))
        {
            // Dos webhooks concurrentes con el mismo teléfono pasan el FirstOrDefault de arriba
            // antes de que ninguno haya guardado; el índice único es la última barrera.
            return await db.Usuarios.SingleAsync(u => u.Telefono == telefonoNormalizado, cancellationToken);
        }

        logger.LogInformation(
            "Usuario creado por canal {Canal} con identificador {IdentificadorCanal}",
            canalOrigen,
            telefonoNormalizado);

        return nuevo;
    }

    private static bool ViolaElIndiceUnicoDeTelefono(DbUpdateException ex) =>
        ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation };
}
