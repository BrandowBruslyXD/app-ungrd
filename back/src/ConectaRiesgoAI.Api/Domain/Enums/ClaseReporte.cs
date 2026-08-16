namespace ConectaRiesgoAI.Api.Domain.Enums;

/// <summary>
/// Distingue un aviso sobre un evento (p. ej. una vía afectada que alguien reporta de paso)
/// de una afectación que el ciudadano vive en carne propia. No son lo mismo: mezclarlos
/// produce falsas expectativas y datos inutilizables para la alcaldía.
/// </summary>
public enum ClaseReporte
{
    AvisoEvento,
    AfectacionPropia
}
