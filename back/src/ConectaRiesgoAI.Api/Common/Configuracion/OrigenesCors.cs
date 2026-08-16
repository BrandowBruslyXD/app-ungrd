namespace ConectaRiesgoAI.Api.Common.Configuracion;

/// <summary>
/// Resuelve qué orígenes web pueden llamar a la API.
/// </summary>
/// <remarks>
/// Existe por un detalle de cómo .NET arma la configuración: un arreglo de
/// <c>appsettings.json</c> y las variables de entorno <c>Cors__Origenes__0</c>,
/// <c>__1</c>… se <b>combinan por índice</b>, no se reemplazan. Si el archivo
/// trae cuatro orígenes de desarrollo y producción define solo el índice 3, los
/// tres de <c>localhost</c> siguen permitidos en producción; y no hay forma de
/// borrar un índice con variables de entorno.
///
/// Por eso <see cref="Variable"/> gana y reemplaza la lista entera: en cada
/// entorno queda exactamente lo que se puso, sin arrastrar lo del archivo.
/// </remarks>
public static class OrigenesCors
{
    /// <summary>Sección del arreglo en <c>appsettings.json</c>.</summary>
    public const string Seccion = "Cors:Origenes";

    /// <summary>
    /// Variable que reemplaza la lista, con los orígenes separados por comas.
    /// Se llama sin dobles guiones bajos a propósito: así se ve de un vistazo que
    /// no es un elemento más del arreglo sino algo que lo sustituye.
    /// </summary>
    public const string Variable = "CORS_ORIGENES";

    /// <summary>Se usa cuando no hay nada configurado: el Vite de cada máquina.</summary>
    private static readonly string[] PorDefecto = ["http://localhost:5173"];

    /// <summary>
    /// Devuelve los orígenes permitidos, en orden de prioridad:
    /// <see cref="Variable"/>, luego <see cref="Seccion"/>, luego el de desarrollo.
    /// </summary>
    /// <param name="configuracion">Configuración de la aplicación.</param>
    /// <returns>Orígenes sin repetir, sin espacios sobrantes y sin barra final.</returns>
    public static string[] Resolver(IConfiguration configuracion)
    {
        ArgumentNullException.ThrowIfNull(configuracion);

        string? lista = configuracion[Variable];
        if (!string.IsNullOrWhiteSpace(lista))
        {
            string[] deLaVariable = Normalizar(lista.Split(','));
            if (deLaVariable.Length > 0)
            {
                return deLaVariable;
            }
        }

        string[]? delArchivo = configuracion.GetSection(Seccion).Get<string[]>();
        if (delArchivo is { Length: > 0 })
        {
            string[] normalizados = Normalizar(delArchivo);
            if (normalizados.Length > 0)
            {
                return normalizados;
            }
        }

        return PorDefecto;
    }

    /// <summary>
    /// Limpia la lista de orígenes.
    /// </summary>
    /// <remarks>
    /// La barra final importa: el navegador manda <c>Origin</c> sin ella, y un
    /// <c>https://sitio.app/</c> configurado por error nunca coincide. Es un fallo
    /// silencioso —no hay error en el registro, solo peticiones bloqueadas— así
    /// que se corrige aquí en vez de confiar en que nadie la escriba.
    /// </remarks>
    private static string[] Normalizar(IEnumerable<string> origenes) =>
        origenes
            .Where(o => !string.IsNullOrWhiteSpace(o))
            .Select(o => o.Trim().TrimEnd('/'))
            .Where(o => o.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
}
