namespace RespondeYA.Integraciones.Configuracion;

/// <summary>
/// Todas las claves de servicios externos.
/// Se llenan desde appsettings o variables de entorno.
/// NUNCA se escriben valores reales en el código: este repositorio es público.
/// </summary>
public class OpcionesIntegraciones
{
    public const string Seccion = "Integraciones";

    public OpcionesNasa Nasa { get; set; } = new();
    public OpcionesSecop Secop { get; set; } = new();
    public OpcionesSocial Social { get; set; } = new();
}

public class OpcionesNasa
{
    /// <summary>Clave gratuita de NASA FIRMS. Se pide en firms.modaps.eosdis.nasa.gov/api/area/</summary>
    public string MapKey { get; set; } = string.Empty;

    /// <summary>Días hacia atrás que se consultan. FIRMS admite hasta 10.</summary>
    public int DiasAtras { get; set; } = 2;

    /// <summary>Radio en km para considerar que un foco confirma el reporte.</summary>
    public double RadioConfirmacionKm { get; set; } = 5;

    public bool Habilitado => !string.IsNullOrWhiteSpace(MapKey);
}

public class OpcionesSecop
{
    /// <summary>
    /// Token de datos.gov.co (Socrata). Es OPCIONAL: sin él la API funciona
    /// con un límite de peticiones más bajo, suficiente para el hackathon.
    /// </summary>
    public string AppToken { get; set; } = string.Empty;

    /// <summary>Máximo de contratos a devolver por municipio.</summary>
    public int MaximoContratos { get; set; } = 5;
}

public class OpcionesSocial
{
    /// <summary>Qué fuente usar: "Bluesky", "X" o "Ninguna".</summary>
    public string Proveedor { get; set; } = "Bluesky";

    /// <summary>Usuario de Bluesky, por ejemplo respondeya.bsky.social</summary>
    public string BlueskyIdentificador { get; set; } = string.Empty;

    /// <summary>Contraseña de aplicación de Bluesky (NO la contraseña de la cuenta).</summary>
    public string BlueskyPassword { get; set; } = string.Empty;

    /// <summary>Bearer token de X API v2. Requiere plan de pago para buscar publicaciones.</summary>
    public string XBearerToken { get; set; } = string.Empty;
}
