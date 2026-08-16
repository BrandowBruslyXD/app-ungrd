using ConectaRiesgoAI.Api.Domain.Enums;

namespace ConectaRiesgoAI.Api.Features.Ingesta.CrearReporte;

/// <summary>
/// El bot habla en snake_case ("afectacion_propia"); el dominio en PascalCase (<see cref="ClaseReporte.AfectacionPropia"/>).
/// El <c>JsonStringEnumConverter</c> global no traduce eso, así que se mapea a mano.
/// </summary>
public static class MapeoClaseReporte
{
    public static bool TryMapear(string? valor, out ClaseReporte clase)
    {
        switch (valor?.Trim().ToLowerInvariant())
        {
            case "afectacion_propia":
                clase = ClaseReporte.AfectacionPropia;
                return true;
            case "aviso_evento":
                clase = ClaseReporte.AvisoEvento;
                return true;
            default:
                clase = default;
                return false;
        }
    }
}
