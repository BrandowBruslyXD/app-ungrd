namespace ConectaRiesgoAI.Api.Features.Ingesta.ObtenerReporte;

/// <summary>
/// Texto ya armado para que el bot lo interpole en WhatsApp: sin arreglos, solo variables
/// planas (ver docs/INTEGRACION-BOT-BACKEND.md, sección 3.2). <see cref="Estado"/> es texto
/// libre y no el enum <c>EstadoReporte</c> porque un código inexistente responde
/// <c>"No encontrado"</c>, que no es un estado válido de reporte.
/// </summary>
public record ObtenerReporteIngestaResponse(string Codigo, string Estado, string Actualizado, string Detalle);
