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
    public bool EsDuplicadoDeReferenciaExterna(DbUpdateException excepcion) =>
        excepcion.InnerException is PostgresException
        {
            SqlState: PostgresErrorCodes.UniqueViolation,
            ConstraintName: "IX_reportes_Canal_ReferenciaExterna"
        };
}
