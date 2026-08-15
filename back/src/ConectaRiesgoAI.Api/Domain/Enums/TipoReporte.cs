namespace ConectaRiesgoAI.Api.Domain.Enums;

/// <summary>
/// Tipos de emergencia. Sin tildes ni eñes: estos valores viajan tal cual entre C# y JavaScript.
/// </summary>
public enum TipoReporte
{
    Incendio,
    Inundacion,
    Deslizamiento,
    ViaAfectada,
    ColapsoEstructural,
    Otro
}
