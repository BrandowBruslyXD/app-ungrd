namespace ConectaRiesgoAI.Api.Integrations.Secop;

/// <summary>Configuración de la integración con SECOP, enlazada desde la sección <c>Secop</c>.</summary>
public class SecopOptions
{
    public const string Seccion = "Secop";

    /// <summary>App token de Datos Abiertos de Colombia (Socrata). Opcional para uso básico, pero sin él el límite de tasa es más bajo.</summary>
    public string AppToken { get; set; } = string.Empty;

    /// <summary>Tope de contratos que devuelve la consulta. La pantalla de detalle no puede volverse un listado infinito.</summary>
    public int MaximoContratos { get; set; } = 5;

    /// <summary>
    /// Si la consulta real a SECOP falla, usa <see cref="SecopContratosRespaldo"/> (datos
    /// pregrabados, no reales) en vez de devolver lista vacía. Por defecto <c>false</c>: el
    /// criterio de aceptación del issue CR-23 pide que, si SECOP no responde, el bloque
    /// simplemente no aparezca — mostrar cifras de contratos fabricadas como si fueran reales
    /// no es aceptable fuera de una demo. Se activa explícitamente en
    /// <c>appsettings.Development.json</c> para que la demo no dependa de que SECOP esté arriba.
    /// </summary>
    public bool UsarRespaldoSiFalla { get; set; }
}
