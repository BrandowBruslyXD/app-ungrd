namespace ConectaRiesgoAI.Api.Features.Verificacion.VerificacionSatelital;

/// <summary>
/// Mismos campos que <c>VerificacionSatelital</c> de <c>Domain/Entities</c>, sin <c>ReporteId</c>
/// porque esta consulta no está ligada a ningún reporte — duplicado a propósito entre rebanadas
/// (CLAUDE.md, cero acoplamiento), no un tipo compartido.
/// </summary>
public record VerificacionSatelitalResponse(string Fuente, bool Confirmado, int FocosDetectados, double? DistanciaMasCercanaKm, string Detalle, DateTime ConsultadoEn);
