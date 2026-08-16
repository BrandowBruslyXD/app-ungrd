using ConectaRiesgoAI.Api.Domain.Enums;
using MediatR;

namespace ConectaRiesgoAI.Api.Features.Reportes.ListarReportes;

public record ListarReportesQuery(
    TipoReporte? Tipo,
    EstadoReporte? Estado,
    double? Lat,
    double? Lng,
    double? RadioKm,
    string? Municipio,
    int? Limite) : IRequest<List<ReporteResumenResponse>>;
