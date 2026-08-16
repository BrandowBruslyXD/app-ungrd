using ConectaRiesgoAI.Api.Domain.Entities;
using ConectaRiesgoAI.Api.Domain.Enums;
using ConectaRiesgoAI.Api.Persistence;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace ConectaRiesgoAI.Api.Common.Reportes;

/// <inheritdoc cref="IBuscadorReporteIdempotente" />
public class BuscadorReporteIdempotente(AppDbContext db) : IBuscadorReporteIdempotente
{
    /// <inheritdoc />
    public Task<Reporte?> BuscarExistenteAsync(
        CanalOrigen canal,
        string? referenciaExterna,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(referenciaExterna))
        {
            return Task.FromResult<Reporte?>(null);
        }

        string referencia = referenciaExterna.Trim();

        return db.Reportes
            .AsNoTracking()
            .FirstOrDefaultAsync(
                r => r.Canal == canal && r.ReferenciaExterna == referencia,
                cancellationToken);
    }

    /// <inheritdoc />
    /// <remarks>El nombre del índice debe coincidir con <see cref="IndicesPostgres.ReportesCanalReferenciaExterna"/>.</remarks>
    public bool EsDuplicadoDeReferenciaExterna(DbUpdateException excepcion)
    {
        if (excepcion.InnerException is PostgresException pg)
        {
            return pg.SqlState == PostgresErrorCodes.UniqueViolation
                && pg.ConstraintName == IndicesPostgres.ReportesCanalReferenciaExterna;
        }

        // Respaldo cuando el proveedor no expone ConstraintName (p. ej. SQLite en pruebas):
        // solo cuenta inserts rechazados de Reporte con referencia externa.
        return excepcion.Entries.Any(entry =>
            entry.State == EntityState.Added
            && entry.Entity is Reporte reporte
            && !string.IsNullOrWhiteSpace(reporte.ReferenciaExterna));
    }
}
