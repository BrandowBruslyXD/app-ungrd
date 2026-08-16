using ConectaRiesgoAI.Api.Domain.Enums;

namespace ConectaRiesgoAI.Api.Features.Ingesta.RegistrarCenso;

/// <summary>Respuesta mínima que el bot interpola en el mensaje de WhatsApp.</summary>
public record RegistrarCensoResponse(string Codigo, string CodigoOperacionCenso, EstadoPersonaAfectada Estado);
