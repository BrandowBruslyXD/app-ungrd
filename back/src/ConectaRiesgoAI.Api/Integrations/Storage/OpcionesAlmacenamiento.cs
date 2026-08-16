namespace ConectaRiesgoAI.Api.Integrations.Storage;

/// <summary>Configuración de <c>AzureStorage</c> en appsettings.</summary>
public class OpcionesAlmacenamiento
{
    public const string Seccion = "AzureStorage";

    /// <summary>Cuánto dura la URL firmada antes de que Azure la rechace.</summary>
    public int SasExpiracionMinutos { get; set; } = 60;
}
