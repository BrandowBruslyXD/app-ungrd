namespace ConectaRiesgoAI.Api.Integrations.Secop;

/// <summary>Configuración de la integración con SECOP, enlazada desde la sección <c>Secop</c>.</summary>
public class SecopOptions
{
    public const string Seccion = "Secop";

    /// <summary>App token de Datos Abiertos de Colombia (Socrata). Opcional para uso básico, pero sin él el límite de tasa es más bajo.</summary>
    public string AppToken { get; set; } = string.Empty;

    /// <summary>Tope de contratos que devuelve la consulta. La pantalla de detalle no puede volverse un listado infinito.</summary>
    public int MaximoContratos { get; set; } = 5;

    /// <summary>Si la consulta real a SECOP falla, usa <see cref="SecopContratosRespaldo"/> en vez de devolver lista vacía.</summary>
    public bool UsarRespaldoSiFalla { get; set; } = true;
}
