using MediatR;

namespace ConectaRiesgoAI.Api.Features.Estadisticas.ResumenEstadisticas;

/// <summary>Petición de <c>GET /api/estadisticas/resumen</c> (ver CONTRATO-API.md).</summary>
public record ResumenEstadisticasQuery(
    string? Municipio,
    double? Lat,
    double? Lng,
    double? RadioKm) : IRequest<ResumenEstadisticasResponse>;
