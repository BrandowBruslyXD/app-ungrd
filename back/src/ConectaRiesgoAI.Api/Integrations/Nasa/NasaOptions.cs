namespace ConectaRiesgoAI.Api.Integrations.Nasa;

/// <summary>Configuración de la integración con NASA FIRMS, enlazada desde la sección <c>Nasa</c>.</summary>
public class NasaOptions
{
    public const string Seccion = "Nasa";

    /// <summary>
    /// MAP_KEY gratuita de firms.modaps.eosdis.nasa.gov/api/. Sin ella, <see cref="NasaFirmsClient"/>
    /// no llama a la API (bloqueante B4 de CONTROL.md): la verificación satelital simplemente no
    /// aparece, sin romper el reporte (CONTRATO-API.md, regla 3).
    /// </summary>
    public string ApiKey { get; set; } = string.Empty;

    /// <summary>Cuántos días hacia atrás busca focos de calor. FIRMS acepta de 1 a 5.</summary>
    public int DiasHaciaAtras { get; set; } = 1;

    /// <summary>Radio en km usado al verificar un reporte de incendio recién creado (issue #18).</summary>
    public double RadioConfirmacionKm { get; set; } = 5;
}
