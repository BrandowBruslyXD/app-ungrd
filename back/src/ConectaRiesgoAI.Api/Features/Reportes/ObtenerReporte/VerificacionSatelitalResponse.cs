namespace ConectaRiesgoAI.Api.Features.Reportes.ObtenerReporte;

public record VerificacionSatelitalResponse(string Fuente, bool Confirmado, string Detalle, DateTime ConsultadoEn);
