namespace ConectaRiesgoAI.Api.Integrations.Storage;

/// <summary>
/// Los dos contenedores privados de Azure Blob Storage. Nunca hay un tercero:
/// ver issue #47.
/// </summary>
public enum Contenedor
{
    /// <summary>Fotos de reportes ciudadanos.</summary>
    Evidencias,

    /// <summary>Evidencia del censo del brigadista. Privado siempre.</summary>
    Censo
}

internal static class ContenedorExtensions
{
    /// <summary>Nombre real del contenedor en Azure. Hardcodeado a propósito: no varía por ambiente.</summary>
    public static string ANombre(this Contenedor contenedor) => contenedor switch
    {
        Contenedor.Evidencias => "evidencias",
        Contenedor.Censo => "censo",
        _ => throw new ArgumentOutOfRangeException(nameof(contenedor))
    };
}
