namespace ConectaRiesgoAI.Api.Integrations.Storage;

/// <summary>
/// Sube archivos a Azure Blob Storage y devuelve URLs firmadas y temporales.
/// Cualquier falla de Azure/red se atrapa dentro: nunca propaga una excepción,
/// igual que el resto de <c>Integrations/</c> (ver CLAUDE.md).
/// </summary>
public interface IAlmacenamientoDeArchivos
{
    /// <summary>
    /// Sube <paramref name="contenido"/> al <paramref name="contenedor"/> indicado.
    /// El nombre del blob lo genera esta implementación; nunca usa un nombre que venga del cliente.
    /// </summary>
    Task<ResultadoSubida> SubirAsync(
        Contenedor contenedor,
        Stream contenido,
        string tipoContenido,
        CancellationToken cancellationToken);
}
