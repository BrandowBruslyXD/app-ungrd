using ConectaRiesgoAI.Api.Domain.Enums;

namespace ConectaRiesgoAI.Api.Features.Reportes.ObtenerReporte;

public record ObtenerReporteResponse(
    string Codigo,
    TipoReporte Tipo,
    string Descripcion,
    double Latitud,
    double Longitud,
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

public record EventoCronologiaResponse(EstadoReporte Estado, string Nota, DateTime Fecha, string Responsable);

public record VerificacionSatelitalResponse(string Fuente, bool Confirmado, string Detalle, DateTime ConsultadoEn);

/// <summary>
/// Forma del bloque de transparencia (SECOP) que define CONTRATO-API.md. La integración es
/// otra rebanada (`area:datos`, todavía sin construir): mientras tanto este endpoint siempre
/// devuelve la lista vacía, que es la respuesta segura que ya contempla el contrato.
/// </summary>
public record TransparenciaItemResponse(string Objeto, decimal Valor, int Anio, string Entidad);
