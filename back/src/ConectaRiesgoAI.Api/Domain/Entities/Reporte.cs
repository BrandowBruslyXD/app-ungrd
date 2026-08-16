using ConectaRiesgoAI.Api.Domain.Enums;

namespace ConectaRiesgoAI.Api.Domain.Entities;

public class Reporte
{
    /// <summary>Identificador interno. Hacia afuera el reporte se consulta por <see cref="Codigo"/>.</summary>
    public int Id { get; set; }

    /// <summary>Identificador público, con formato <c>RPT-2026-08-15-0047</c>.</summary>
    public string Codigo { get; set; } = null!;

    public TipoReporte Tipo { get; set; }
    public string Descripcion { get; set; } = null!;

    /// <summary>Coordenadas del GPS. Nulas cuando el reporte entra por WhatsApp: ahí solo hay <see cref="UbicacionTexto"/>.</summary>
    public double? Latitud { get; set; }
    public double? Longitud { get; set; }

    public string? Direccion { get; set; }
    public string Municipio { get; set; } = null!;
    public string? UrlFoto { get; set; }

    /// <summary>Ubicación en texto libre, tal como la escribe el ciudadano por WhatsApp (p. ej. "Soacha, Villa Mercedes, frente a la cancha").</summary>
    public string? UbicacionTexto { get; set; }

    /// <summary>Distingue un aviso sobre un evento de una afectación propia del ciudadano.</summary>
    public ClaseReporte Clase { get; set; } = ClaseReporte.AfectacionPropia;

    /// <summary>Nivel de respaldo del dato: no es lo mismo autorreportado que censado.</summary>
    public ConfianzaReporte Confianza { get; set; } = ConfianzaReporte.Autorreportado;

    /// <summary>Canal por el que entró el reporte: web con GPS, o WhatsApp con ubicación en texto.</summary>
    public CanalOrigen Canal { get; set; } = CanalOrigen.Web;

    public EstadoReporte Estado { get; set; } = EstadoReporte.Reportado;
    public Prioridad Prioridad { get; set; } = Prioridad.Media;

    public DateTime CreadoEn { get; set; } = DateTime.UtcNow;
    public DateTime ActualizadoEn { get; set; } = DateTime.UtcNow;

    public int UsuarioId { get; set; }
    public Usuario Usuario { get; set; } = null!;

    public ICollection<EventoCronologia> Cronologia { get; set; } = new List<EventoCronologia>();
    public ICollection<VerificacionSatelital> VerificacionesSatelitales { get; set; } = new List<VerificacionSatelital>();

    /// <summary>
    /// Arma el código público del reporte. El consecutivo lo calcula quien crea el reporte,
    /// normalmente contando los del día; la entidad solo le da formato.
    /// </summary>
    public static string GenerarCodigo(DateTime fechaUtc, int consecutivo) =>
        $"RPT-{fechaUtc:yyyy-MM-dd}-{consecutivo:D4}";

    /// <summary>
    /// Avanza el estado y deja la huella en la cronología.
    /// Se puede saltar hacia adelante (de Reportado a Asignado), nunca hacia atrás.
    /// </summary>
    /// <exception cref="InvalidOperationException">Si el estado nuevo no va hacia adelante.</exception>
    public void CambiarEstado(EstadoReporte nuevoEstado, string nota, string responsable)
    {
        if (nuevoEstado <= Estado)
        {
            throw new InvalidOperationException(
                $"No se puede pasar de '{Estado}' a '{nuevoEstado}': los estados solo avanzan.");
        }

        Estado = nuevoEstado;
        ActualizadoEn = DateTime.UtcNow;
        Cronologia.Add(new EventoCronologia
        {
            Estado = nuevoEstado,
            Nota = nota,
            Responsable = responsable,
            Fecha = ActualizadoEn
        });
    }
}
