using ConectaRiesgoAI.Api.Domain.Enums;

namespace ConectaRiesgoAI.Api.Features.Reportes.MisReportes;

public record ReporteResumenResponse(
    string Codigo,
    TipoReporte Tipo,
    string Descripcion,
    double? Latitud,
    double? Longitud,
    string? Direccion,
    string Municipio,
    string? UrlFoto,
    EstadoReporte Estado,
    Prioridad Prioridad,
    double? DistanciaKm,
    DateTime CreadoEn);
