namespace ConectaRiesgoAI.Api.Domain.Enums;

/// <summary>Severidad de un <see cref="Entities.DanoRegistrado"/>.</summary>
public enum NivelDano
{
    /// <summary>Puede habitarse.</summary>
    Leve,

    /// <summary>Requiere reparaciones.</summary>
    Moderado,

    /// <summary>Inhabitable.</summary>
    Grave,
    DestruccionTotal
}
