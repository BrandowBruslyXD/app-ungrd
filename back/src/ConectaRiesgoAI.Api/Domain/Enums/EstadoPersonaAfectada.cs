namespace ConectaRiesgoAI.Api.Domain.Enums;

/// <summary>
/// Estado del registro de una <see cref="Entities.PersonaAfectada"/>. El bot de WhatsApp solo
/// llena una versión reducida y la deja en <see cref="Borrador"/>; el brigadista la completa
/// después desde el frontend (fuera de alcance de este issue).
/// </summary>
public enum EstadoPersonaAfectada
{
    Borrador,
    Completo,
    Verificado,
    Rechazado
}
