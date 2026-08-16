using ConectaRiesgoAI.Api.Domain.Enums;

namespace ConectaRiesgoAI.Api.Features.Reportes.ActualizarEstado;

/// <summary>Cuerpo de <c>PATCH /api/reportes/{codigo}/estado</c>; el código llega por la ruta, no por acá.</summary>
public record ActualizarEstadoRequest(EstadoReporte Estado, string Nota);
