namespace ConectaRiesgoAI.Api.Domain.Enums;

/// <summary>
/// Estados por los que pasa un reporte. El orden numérico importa: define qué transiciones
/// son válidas. Se puede saltar hacia adelante, nunca hacia atrás (ver <see cref="Entities.Reporte.CambiarEstado"/>).
/// </summary>
public enum EstadoReporte
{
    Reportado = 0,
    Verificado = 1,
    Asignado = 2,
    EnAtencion = 3,
    Atendido = 4,
    Cerrado = 5
}
