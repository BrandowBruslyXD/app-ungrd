namespace ConectaRiesgoAI.Api.Features.Estadisticas.ResumenEstadisticas;

/// <summary>Respuesta `200` de <c>GET /api/estadisticas/resumen</c> (ver CONTRATO-API.md).</summary>
public record ResumenEstadisticasResponse(
    IReadOnlyDictionary<string, int> PorTipo,
    int TotalHoy,
    int Atendidos,
    int PorcentajeAtendidos,
    int TiempoPromedioMinutos);
