using System.Globalization;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RespondeYA.Integraciones.Configuracion;
using RespondeYA.Integraciones.Modelos;

namespace RespondeYA.Integraciones.Nasa;

public interface IServicioFirms
{
    Task<VerificacionSatelital?> VerificarAsync(double lat, double lon, CancellationToken ct = default);
}

/// <summary>
/// Consulta NASA FIRMS para saber si hay focos de calor cerca de un reporte.
///
/// LÍMITE IMPORTANTE Y HONESTO: FIRMS detecta anomalías térmicas, es decir INCENDIOS.
/// No sirve para confirmar inundaciones, deslizamientos ni vías afectadas.
/// Para esos tipos este servicio devuelve null y el frontend oculta el bloque.
/// Decir esto en el pitch suma credibilidad; prometer que "verificamos todo por
/// satélite" es una exageración que un jurado técnico detecta de inmediato.
/// </summary>
public class ServicioFirms : IServicioFirms
{
    private readonly HttpClient _http;
    private readonly OpcionesNasa _opciones;
    private readonly IMemoryCache _cache;
    private readonly ILogger<ServicioFirms> _log;

    // VIIRS tiene 375 m de resolución: es el que mejor detecta incendios pequeños.
    private const string Fuente = "VIIRS_SNPP_NRT";

    public ServicioFirms(
        HttpClient http,
        IOptions<OpcionesIntegraciones> opciones,
        IMemoryCache cache,
        ILogger<ServicioFirms> log)
    {
        _http = http;
        _opciones = opciones.Value.Nasa;
        _cache = cache;
        _log = log;
    }

    public async Task<VerificacionSatelital?> VerificarAsync(double lat, double lon, CancellationToken ct = default)
    {
        if (!_opciones.Habilitado)
        {
            _log.LogWarning("NASA FIRMS sin MapKey configurada. Se omite la verificación satelital.");
            return null;
        }

        // Redondear a 2 decimales (~1 km) hace que reportes vecinos compartan caché.
        var llave = $"firms:{lat:F2},{lon:F2}";
        if (_cache.TryGetValue<VerificacionSatelital>(llave, out var enCache))
            return enCache;

        try
        {
            var caja = Geo.CajaDelimitadora(lat, lon, _opciones.RadioConfirmacionKm);
            var url = $"api/area/csv/{_opciones.MapKey}/{Fuente}/{caja}/{_opciones.DiasAtras}";

            var respuesta = await _http.GetAsync(url, ct);
            if (!respuesta.IsSuccessStatusCode)
            {
                _log.LogWarning("NASA FIRMS respondió {Codigo}", respuesta.StatusCode);
                return null;
            }

            var csv = await respuesta.Content.ReadAsStringAsync(ct);
            var resultado = Interpretar(csv, lat, lon);

            // Cachear incluso el resultado negativo: evita repetir la llamada
            // cada vez que alguien abre el mismo reporte durante la demo.
            _cache.Set(llave, resultado, TimeSpan.FromMinutes(30));
            return resultado;
        }
        catch (Exception ex)
        {
            // Nunca propagar: un servicio externo caído no puede tumbar la pantalla
            // de seguimiento, que es la más importante del pitch.
            _log.LogError(ex, "Falló la consulta a NASA FIRMS");
            return null;
        }
    }

    /// <summary>
    /// FIRMS devuelve CSV. Encabezado real de VIIRS:
    /// latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,
    /// instrument,confidence,version,bright_ti5,frp,daynight
    /// </summary>
    private VerificacionSatelital? Interpretar(string csv, double lat, double lon)
    {
        var lineas = csv.Split('\n', StringSplitOptions.RemoveEmptyEntries);

        // Solo el encabezado significa que no hubo detecciones.
        if (lineas.Length <= 1)
        {
            return new VerificacionSatelital(
                Fuente: "NASA FIRMS",
                Confirmado: false,
                Detalle: "Sin focos de calor detectados en la zona",
                ConsultadoEn: DateTime.UtcNow,
                FocosDetectados: 0,
                DistanciaMasCercanaKm: null);
        }

        var encabezado = lineas[0].Split(',');
        var iLat = Array.IndexOf(encabezado, "latitude");
        var iLon = Array.IndexOf(encabezado, "longitude");
        var iConf = Array.IndexOf(encabezado, "confidence");

        if (iLat < 0 || iLon < 0)
        {
            _log.LogWarning("El CSV de FIRMS no trae las columnas esperadas: {Encabezado}", lineas[0]);
            return null;
        }

        var focos = 0;
        double? masCercano = null;

        foreach (var linea in lineas.Skip(1))
        {
            var campos = linea.Split(',');
            if (campos.Length <= Math.Max(iLat, iLon)) continue;

            if (!double.TryParse(campos[iLat], NumberStyles.Float, CultureInfo.InvariantCulture, out var fLat)) continue;
            if (!double.TryParse(campos[iLon], NumberStyles.Float, CultureInfo.InvariantCulture, out var fLon)) continue;

            // FIRMS marca la confianza como l/n/h (low/nominal/high). Se descarta la baja
            // para no anunciar "confirmado por satélite" con una detección dudosa.
            if (iConf >= 0 && iConf < campos.Length &&
                campos[iConf].Trim().Equals("l", StringComparison.OrdinalIgnoreCase))
                continue;

            var distancia = Geo.DistanciaKm(lat, lon, fLat, fLon);
            if (distancia > _opciones.RadioConfirmacionKm) continue;

            focos++;
            if (masCercano is null || distancia < masCercano) masCercano = distancia;
        }

        var confirmado = focos > 0;
        var detalle = confirmado
            ? $"{focos} foco{(focos == 1 ? "" : "s")} de calor detectado{(focos == 1 ? "" : "s")} " +
              $"a menos de {_opciones.RadioConfirmacionKm:F0} km (el más cercano a {masCercano:F1} km)"
            : "Sin focos de calor detectados en la zona";

        return new VerificacionSatelital(
            Fuente: "NASA FIRMS",
            Confirmado: confirmado,
            Detalle: detalle,
            ConsultadoEn: DateTime.UtcNow,
            FocosDetectados: focos,
            DistanciaMasCercanaKm: masCercano);
    }
}
