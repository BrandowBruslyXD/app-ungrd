namespace ConectaRiesgoAI.Api.Common.Auth;

/// <summary>Clave de servicio con la que el bot de WhatsApp se autentica en /api/ingesta/*.</summary>
public class OpcionesApiKeyIngesta
{
    public const string Seccion = "IngestaBot";

    public string ApiKey { get; set; } = null!;
}
