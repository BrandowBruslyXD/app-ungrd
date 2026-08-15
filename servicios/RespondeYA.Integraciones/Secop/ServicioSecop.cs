using System.Globalization;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RespondeYA.Integraciones.Configuracion;
using RespondeYA.Integraciones.Modelos;

namespace RespondeYA.Integraciones.Secop;

public interface IServicioSecop
{
    Task<ResultadoContratos> ObtenerContratosPrevencionAsync(
        string municipio, CancellationToken ct = default);
}

/// <summary>
/// Consulta SECOP II (Datos Abiertos de Colombia) para mostrar cuánto ha
/// invertido la alcaldía en prevención del riesgo en la zona del reporte.
///
/// Este es el diferenciador más fuerte del pitch: nadie más conecta el reporte
/// ciudadano de una emergencia con el gasto público destinado a prevenirla.
/// </summary>
public class ServicioSecop : IServicioSecop
{
    private readonly HttpClient _http;
    private readonly OpcionesSecop _opciones;
    private readonly IMemoryCache _cache;
    private readonly ILogger<ServicioSecop> _log;

    // Dataset SECOP II - Contratos Electrónicos en datos.gov.co
    private const string Dataset = "jbjy-vk9h";

    /// <summary>
    /// Palabras que identifican un contrato de prevención del riesgo.
    /// En mayúscula y sin tildes, porque así se comparan contra la consulta.
    /// </summary>
    private static readonly string[] PalabrasClave =
    [
        "ALCANTARILLADO", "CANALIZACION", "GESTION DEL RIESGO", "PREVENCION",
        "MITIGACION", "OBRAS DE CONTENCION", "MURO DE CONTENCION",
        "DRAGADO", "DESASTRE", "EMERGENCIA", "INUNDACION", "DESLIZAMIENTO",
        "BOMBEROS", "ATENCION DE DESASTRES"
    ];

    public ServicioSecop(
        HttpClient http,
        IOptions<OpcionesIntegraciones> opciones,
        IMemoryCache cache,
        ILogger<ServicioSecop> log)
    {
        _http = http;
        _opciones = opciones.Value.Secop;
        _cache = cache;
        _log = log;
    }

    public async Task<ResultadoContratos> ObtenerContratosPrevencionAsync(
        string municipio, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(municipio))
            return new ResultadoContratos([], OrigenDatos.ApiEnVivo);

        var llave = $"secop:{municipio.ToUpperInvariant()}";
        if (_cache.TryGetValue<ResultadoContratos>(llave, out var enCache) && enCache is not null)
            return enCache;

        try
        {
            var url = ConstruirConsulta(municipio);
            var respuesta = await _http.GetAsync(url, ct);

            if (!respuesta.IsSuccessStatusCode)
            {
                _log.LogWarning("SECOP respondió {Codigo} para {Municipio}. Se usa el respaldo.",
                    respuesta.StatusCode, municipio);
                return UsarRespaldo(municipio, llave);
            }

            var json = await respuesta.Content.ReadAsStringAsync(ct);
            var contratos = Interpretar(json);

            // Si la API responde pero no encuentra nada, se respeta ese vacío:
            // es un dato real, no una falla. El frontend oculta el bloque.
            var resultado = new ResultadoContratos(contratos, OrigenDatos.ApiEnVivo);

            // Los datos de contratación no cambian durante un hackathon.
            // Una hora de caché evita golpear la API en cada carga de pantalla.
            _cache.Set(llave, resultado, TimeSpan.FromHours(1));
            return resultado;
        }
        catch (Exception ex)
        {
            // Si SECOP se cae, se recurre al respaldo antes que dejar la pantalla
            // sin su bloque más llamativo. Nunca se propaga la excepción.
            _log.LogError(ex, "Falló la consulta a SECOP para {Municipio}. Se usa el respaldo.", municipio);
            return UsarRespaldo(municipio, llave);
        }
    }

    /// <summary>
    /// Recurre a los datos de respaldo cuando SECOP no responde.
    /// El resultado queda marcado como tal para que la interfaz lo advierta:
    /// mostrar datos de respaldo como si fueran reales sería engañar al jurado.
    /// </summary>
    private ResultadoContratos UsarRespaldo(string municipio, string llave)
    {
        if (!_opciones.UsarRespaldoSiFalla)
            return new ResultadoContratos([], OrigenDatos.ApiEnVivo);

        var resultado = new ResultadoContratos(
            ContratosRespaldo.Para(municipio),
            OrigenDatos.Respaldo);

        // Caché corta: si SECOP vuelve en 5 minutos, se prefieren los datos reales.
        _cache.Set(llave, resultado, TimeSpan.FromMinutes(5));
        return resultado;
    }

    private string ConstruirConsulta(string municipio)
    {
        // Los nombres de ciudad en SECOP vienen con tildes inconsistentes
        // ("Bogotá", "BOGOTA", "Bogotá D.C."). Usar solo el prefijo sin tildes
        // es más confiable que intentar acertar la escritura exacta.
        var prefijo = PrefijoSinTildes(municipio, 5);

        var filtroPalabras = string.Join(" OR ",
            PalabrasClave.Select(p => $"upper(descripcion_del_proceso) like '%{p}%'"));

        var where = $"upper(ciudad) like '%{prefijo}%' AND ({filtroPalabras})";

        var parametros = new StringBuilder();
        parametros.Append($"?$where={Uri.EscapeDataString(where)}");
        parametros.Append($"&$select={Uri.EscapeDataString("descripcion_del_proceso,valor_del_contrato,fecha_de_firma,nombre_entidad")}");
        parametros.Append($"&$order={Uri.EscapeDataString("valor_del_contrato DESC")}");
        parametros.Append($"&$limit={_opciones.MaximoContratos}");

        // El token es opcional: sin él la API funciona con un límite más bajo.
        if (!string.IsNullOrWhiteSpace(_opciones.AppToken))
            parametros.Append($"&$$app_token={_opciones.AppToken}");

        return $"resource/{Dataset}.json{parametros}";
    }

    private List<ContratoPublico> Interpretar(string json)
    {
        var contratos = new List<ContratoPublico>();

        using var documento = JsonDocument.Parse(json);
        foreach (var fila in documento.RootElement.EnumerateArray())
        {
            var objeto = Texto(fila, "descripcion_del_proceso");
            if (string.IsNullOrWhiteSpace(objeto)) continue;

            // Socrata devuelve los números como texto.
            var valorCrudo = Texto(fila, "valor_del_contrato");
            if (!decimal.TryParse(valorCrudo, NumberStyles.Any, CultureInfo.InvariantCulture, out var valor))
                continue;

            // Un contrato de $0 no le dice nada al ciudadano.
            if (valor <= 0) continue;

            var anio = 0;
            if (DateTime.TryParse(Texto(fila, "fecha_de_firma"), CultureInfo.InvariantCulture,
                    DateTimeStyles.None, out var fecha))
                anio = fecha.Year;

            var entidad = Texto(fila, "nombre_entidad") ?? "Entidad no especificada";

            contratos.Add(new ContratoPublico(
                Objeto: Acortar(objeto, 140),
                Valor: valor,
                Anio: anio,
                Entidad: entidad));
        }

        return contratos;
    }

    private static string? Texto(JsonElement elemento, string propiedad) =>
        elemento.TryGetProperty(propiedad, out var valor) ? valor.GetString() : null;

    /// <summary>Los objetos contractuales son larguísimos y no caben en la pantalla del celular.</summary>
    private static string Acortar(string texto, int maximo)
    {
        texto = texto.Trim();
        return texto.Length <= maximo ? texto : texto[..maximo].TrimEnd() + "…";
    }

    private static string PrefijoSinTildes(string texto, int longitud)
    {
        var normalizado = texto.Trim().Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder();

        foreach (var c in normalizado)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                sb.Append(c);
            if (sb.Length == longitud) break;
        }

        // Se escapa la comilla simple para no romper la consulta SoQL.
        return sb.ToString().ToUpperInvariant().Replace("'", "''");
    }
}
