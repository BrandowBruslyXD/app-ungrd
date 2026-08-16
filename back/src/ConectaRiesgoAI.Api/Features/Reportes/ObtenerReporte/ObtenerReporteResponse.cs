using ConectaRiesgoAI.Api.Domain.Enums;

namespace ConectaRiesgoAI.Api.Features.Reportes.ObtenerReporte;

public record ObtenerReporteResponse(
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
    DateTime CreadoEn,
    string ReportadoPor,
    List<EventoCronologiaResponse> Cronologia,
    VerificacionSatelitalResponse? VerificacionSatelital,
    List<TransparenciaItemResponse> Transparencia);
