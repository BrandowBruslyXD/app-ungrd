namespace ConectaRiesgoAI.Api.Domain.Enums;

/// <summary>
/// Nivel de respaldo del dato de un reporte. Reportar no es lo mismo que ser censado:
/// son dos niveles de confianza distintos y no se pueden mezclar (ver
/// docs/INTEGRACION-BOT-BACKEND.md, sección 5).
/// </summary>
public enum ConfianzaReporte
{
    Autorreportado,
    Verificado,
    Censado,
    Avalado
}
