using ConectaRiesgoAI.Api.Domain.Entities;
using ConectaRiesgoAI.Api.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace ConectaRiesgoAI.Api.Common.Reportes;

/// <summary>
/// Localiza reportes ya creados a partir de la referencia externa del webhook.
/// </summary>
public interface IBuscadorReporteIdempotente
{
    /// <summary>
    /// Busca un reporte existente por canal y referencia externa.
    /// Devuelve <c>null</c> si la referencia está vacía o no hay coincidencia.
    /// </summary>
    Task<Reporte?> BuscarExistenteAsync(
        CanalOrigen canal,
        string? referenciaExterna,
        CancellationToken cancellationToken);

    /// <summary>
    /// Indica si una excepción de guardado fue por duplicar canal + referencia externa.
    /// </summary>
    bool EsDuplicadoDeReferenciaExterna(DbUpdateException excepcion);
}
