namespace ConectaRiesgoAI.Api.Domain.Entities;

/// <summary>
/// Resultado de consultar NASA FIRMS para un reporte. Solo aplica a incendios: en inundaciones
/// y deslizamientos no se genera, y la pantalla de seguimiento oculta el bloque si no hay ninguna.
/// </summary>
public class VerificacionSatelital
{
    public int Id { get; set; }
    public int ReporteId { get; set; }
    public string Fuente { get; set; } = "NASA FIRMS";
    public bool Confirmado { get; set; }
    public int FocosDetectados { get; set; }
    public double? DistanciaMasCercanaKm { get; set; }
    public string Detalle { get; set; } = null!;
    public DateTime ConsultadoEn { get; set; } = DateTime.UtcNow;

    public Reporte Reporte { get; set; } = null!;
}
