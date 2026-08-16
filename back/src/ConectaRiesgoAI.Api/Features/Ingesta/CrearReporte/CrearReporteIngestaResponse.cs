using ConectaRiesgoAI.Api.Domain.Enums;

namespace ConectaRiesgoAI.Api.Features.Ingesta.CrearReporte;

/// <summary>Respuesta mínima que el bot interpola en el mensaje de WhatsApp.</summary>
public record CrearReporteIngestaResponse(string Codigo, EstadoReporte Estado);
