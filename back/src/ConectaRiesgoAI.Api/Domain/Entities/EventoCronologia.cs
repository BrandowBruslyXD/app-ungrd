using ConectaRiesgoAI.Api.Domain.Enums;

namespace ConectaRiesgoAI.Api.Domain.Entities;

/// <summary>
/// Una entrada de la cronología del reporte. Es lo que el ciudadano ve en la pantalla
/// de seguimiento, así que cada cambio de estado tiene que dejar una aquí.
/// </summary>
public class EventoCronologia
{
    public int Id { get; set; }
    public int ReporteId { get; set; }
    public EstadoReporte Estado { get; set; }
    public string Nota { get; set; } = null!;
    public DateTime Fecha { get; set; } = DateTime.UtcNow;

    /// <summary>Quién lo hizo. "Sistema" cuando no fue una persona.</summary>
    public string Responsable { get; set; } = "Sistema";

    public Reporte Reporte { get; set; } = null!;
}
