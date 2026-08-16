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

    /// <summary>Movimiento telúrico. Hay una declaratoria de desastre nacional vigente por este motivo.</summary>
    Sismo,

    /// <summary>Vientos fuertes: techos volados, árboles caídos, redes eléctricas abajo.</summary>
    Vendaval,

    /// <summary>Creciente súbita que arrastra lodo y material. Distinta de una inundación lenta.</summary>
    AvenidaTorrencial,

    Otro
}
