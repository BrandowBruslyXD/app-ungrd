using ConectaRiesgoAI.Api.Domain.Enums;

namespace ConectaRiesgoAI.Api.Features.Reportes.ActualizarEstado;

/// <summary>
/// Cuerpo de <c>PATCH /api/reportes/{codigo}/estado</c>; el código llega por la ruta, no por acá.
/// <c>Estado</c> es anulable a propósito: así un JSON que lo omite deserializa a <c>null</c> y no
/// al primer valor del enum (<c>Reportado</c>), que daría un 400 confuso sobre una transición
/// inválida en vez de uno claro de "falta el estado".
/// </summary>
public record ActualizarEstadoRequest(EstadoReporte? Estado, string Nota);
