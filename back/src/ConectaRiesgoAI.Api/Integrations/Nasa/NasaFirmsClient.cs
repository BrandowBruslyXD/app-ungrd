using System.Globalization;
using Microsoft.Extensions.Options;

namespace ConectaRiesgoAI.Api.Integrations.Nasa;

/// <summary>
/// Cliente HTTP contra el API de área de NASA FIRMS (Fire Information for Resource Management
/// System). Consulta los focos de calor que el sensor VIIRS detectó en un cuadro alrededor del
/// punto dado y descarta los que cayeron en las esquinas del cuadro pero fuera del radio real
/// pedido — FIRMS solo acepta un rectángulo, no un radio, así que el filtro final es Haversine en
/// C# (sin PostGIS, ver decisión D7 en CONTROL.md). Ante cualquier falla responde <c>null</c>:
/// nunca propaga la excepción, porque un NASA FIRMS caído, lento o sin MAP_KEY no puede tumbar la
/// pantalla de seguimiento (CONTRATO-API.md, regla 3).
/// </summary>
public class NasaFirmsClient(HttpClient httpClient, IOptions<NasaOptions> opciones, ILogger<NasaFirmsClient> logger)
    : INasaFirmsClient
{
    /// <summary>Sensor VIIRS a bordo de Suomi NPP: mejor resolución (375 m) que MODIS para confirmar incendios puntuales.</summary>
    private const string Fuente = "VIIRS_SNPP_NRT";

    private const double KmPorGradoLatitud = 111.0;
    private const double RadioTierraKm = 6371;

    private readonly NasaOptions _opciones = opciones.Value;

    /// <inheritdoc />
    public async Task<ResultadoVerificacionSatelital?> ConsultarFocosDeCalorAsync(double lat, double lng, double radioKm, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_opciones.ApiKey))
        {
            // Bloqueante B4 (CONTROL.md): sin MAP_KEY todavía. Llamar igual solo gastaría el
            // timeout completo en una petición condenada a fallar; R2 pide que el bloque
            // satelital se oculte solo, sin ruido en los logs de cada reporte.
            return null;
        }

        try
        {
            string url = ConstruirUrl(lat, lng, radioKm);
            using HttpResponseMessage respuesta = await httpClient.GetAsync(url, cancellationToken);
            if (!respuesta.IsSuccessStatusCode)
            {
                logger.LogWarning("NASA FIRMS respondió {StatusCode} al consultar focos de calor", (int)respuesta.StatusCode);
                return null;
            }

            string cuerpo = await respuesta.Content.ReadAsStringAsync(cancellationToken);
            return InterpretarCsv(cuerpo, lat, lng, radioKm);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            // Deliberadamente amplio: esta es la frontera con un servicio externo (timeout, red,
            // CSV inesperado). Nunca se registra el cuerpo de la respuesta (mismo criterio que
            // SecopClient): puede traer el detalle del error de FIRMS, no dato de nadie, pero no
            // aporta más que el mensaje ya explícito de abajo.
            logger.LogWarning(ex, "Falló la consulta a NASA FIRMS");
            return null;
        }
    }

    private string ConstruirUrl(double lat, double lng, double radioKm)
    {
        double deltaLat = radioKm / KmPorGradoLatitud;
        // En latitudes cercanas a los polos cos(lat) tiende a 0 y deltaLng desborda el rango
        // válido de longitud; en ese caso el cuadro cubre todo el meridiano.
        double cosLat = Math.Cos(GradosARadianes(lat));
        double deltaLng = cosLat > 1e-10
            ? radioKm / (KmPorGradoLatitud * cosLat)
            : 180.0;

        string bbox = FormattableString.Invariant(
            $"{lng - deltaLng:F4},{lat - deltaLat:F4},{lng + deltaLng:F4},{lat + deltaLat:F4}");

        int diasHaciaAtras = Math.Clamp(_opciones.DiasHaciaAtras, 1, 5);
        return $"api/area/csv/{Uri.EscapeDataString(_opciones.ApiKey)}/{Fuente}/{bbox}/{diasHaciaAtras}";
    }

    /// <summary>
    /// Busca <c>latitude</c>/<c>longitude</c> por nombre de columna en vez de por posición: los
    /// distintos <c>SOURCE</c> de FIRMS (VIIRS, MODIS, LANDSAT) no comparten exactamente las
    /// mismas columnas. Si no aparecen, no es un CSV real — FIRMS devuelve errores como
    /// "Invalid MAP_KEY" o límite de transacciones excedido como texto plano con <c>200 OK</c>,
    /// una rareza documentada de su API — y se trata como falla, no como "sin focos".
    /// </summary>
    private ResultadoVerificacionSatelital? InterpretarCsv(string csv, double lat, double lng, double radioKm)
    {
        string[] lineas = csv.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        string[] encabezados = lineas.Length > 0 ? lineas[0].Split(',') : [];
        int indiceLat = Array.FindIndex(encabezados, h => h.Equals("latitude", StringComparison.OrdinalIgnoreCase));
        int indiceLng = Array.FindIndex(encabezados, h => h.Equals("longitude", StringComparison.OrdinalIgnoreCase));

        if (indiceLat < 0 || indiceLng < 0)
        {
            logger.LogWarning("NASA FIRMS devolvió una respuesta con formato inesperado (posible MAP_KEY inválida o límite de transacciones excedido)");
            return null;
        }

        List<double> distanciasDentroDelRadio = [];
        foreach (string linea in lineas.Skip(1))
        {
            string[] campos = linea.Split(',');
            if (campos.Length <= Math.Max(indiceLat, indiceLng)
                || !double.TryParse(campos[indiceLat], NumberStyles.Float, CultureInfo.InvariantCulture, out double focoLat)
                || !double.TryParse(campos[indiceLng], NumberStyles.Float, CultureInfo.InvariantCulture, out double focoLng))
            {
                continue;
            }

            double distanciaKm = CalcularDistanciaKm(lat, lng, focoLat, focoLng);
            if (distanciaKm <= radioKm)
            {
                distanciasDentroDelRadio.Add(distanciaKm);
            }
        }

        if (distanciasDentroDelRadio.Count == 0)
        {
            return new ResultadoVerificacionSatelital(
                Confirmado: false, FocosDetectados: 0, DistanciaMasCercanaKm: null,
                Detalle: $"Sin focos de calor detectados a menos de {radioKm:0} km en los últimos días");
        }

        string sustantivo = distanciasDentroDelRadio.Count == 1 ? "foco de calor detectado" : "focos de calor detectados";
        return new ResultadoVerificacionSatelital(
            Confirmado: true,
            FocosDetectados: distanciasDentroDelRadio.Count,
            DistanciaMasCercanaKm: Math.Round(distanciasDentroDelRadio.Min(), 1),
            Detalle: $"{distanciasDentroDelRadio.Count} {sustantivo} a menos de {radioKm:0} km");
    }

    /// <summary>Distancia entre dos puntos GPS (fórmula de Haversine), igual que en <c>ListarReportesHandler</c>.</summary>
    private static double CalcularDistanciaKm(double lat1, double lng1, double lat2, double lng2)
    {
        double dLat = GradosARadianes(lat2 - lat1);
        double dLng = GradosARadianes(lng2 - lng1);
        double a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
                + Math.Cos(GradosARadianes(lat1)) * Math.Cos(GradosARadianes(lat2))
                * Math.Sin(dLng / 2) * Math.Sin(dLng / 2);
        double c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return RadioTierraKm * c;
    }

    private static double GradosARadianes(double grados) => grados * Math.PI / 180;
}
