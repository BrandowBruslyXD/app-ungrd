using ConectaRiesgoAI.Api.Domain.Enums;

namespace ConectaRiesgoAI.Api.Features.Reportes.CrearReporte;

public record CrearReporteResponse(string Codigo, EstadoReporte Estado, DateTime CreadoEn);
