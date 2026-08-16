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
            Email = EmailIngestaPorCanal(canalOrigen, telefonoNormalizado),
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
            // Hay que desvincular el insert fallido: si queda en Added, un SaveChanges posterior
            // del mismo request reintenta insertarlo y vuelve a chocar con el constraint.
            db.Entry(nuevo).State = EntityState.Detached;
            return await db.Usuarios.SingleAsync(u => u.Telefono == telefonoNormalizado, cancellationToken);
        }

        logger.LogInformation(
            "Usuario creado por canal {Canal} con identificador {IdentificadorCanal}",
            canalOrigen,
            telefonoNormalizado);

        return nuevo;
    }

    /// <summary>Email sintético único por canal; nunca se usa para login.</summary>
    private static string EmailIngestaPorCanal(CanalOrigen canal, string telefono) =>
        canal switch
        {
            CanalOrigen.Telefono => $"tel-{telefono}@ingesta.conectariesgoai.local",
            CanalOrigen.WhatsApp => $"wa-{telefono}@ingesta.conectariesgoai.local",
            _ => $"ingesta-{telefono}@ingesta.conectariesgoai.local"
        };

    private static bool ViolaElIndiceUnicoDeTelefono(DbUpdateException ex)
    {
        if (ex.InnerException is PostgresException pg)
        {
            return pg.SqlState == PostgresErrorCodes.UniqueViolation
                && pg.ConstraintName == IndicesPostgres.UsuariosTelefono;
        }

        // Respaldo cuando el proveedor no expone ConstraintName (p. ej. SQLite en pruebas):
        // solo cuenta inserts rechazados de Usuario con teléfono, no otros errores de SaveChanges.
        return ex.Entries.Any(entry =>
            entry.State == EntityState.Added
            && entry.Entity is Usuario usuario
            && !string.IsNullOrEmpty(usuario.Telefono));
    }
}
