using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RespondeYA.Integraciones.Configuracion;
using RespondeYA.Integraciones.Modelos;

namespace RespondeYA.Integraciones.Social;

/// <summary>
/// Monitoreo de emergencias en X (antes Twitter), vía API v2.
///
/// ⚠️ ESTA FUENTE REQUIERE UN PLAN DE PAGO.
/// El endpoint de búsqueda (/2/tweets/search/recent) NO está incluido en el plan
/// gratuito de X: ese plan solo permite publicar y leer las publicaciones propias.
/// Para buscar hace falta el plan Basic o superior, que cuesta del orden de
/// cientos de dólares al mes.
///
/// El código queda escrito y listo. Si consigues un Bearer Token con acceso de
/// búsqueda, basta con ponerlo en la configuración y cambiar el proveedor a "X".
/// Si la API responde 403, el servicio lo registra con una explicación clara y
/// devuelve una lista vacía en lugar de romper nada.
/// </summary>
public class FuenteX : IFuenteSocial
{
    private readonly HttpClient _http;
    private readonly OpcionesSocial _opciones;
    private readonly ILogger<FuenteX> _log;

    public string Nombre => "X";
    public bool Disponible => !string.IsNullOrWhiteSpace(_opciones.XBearerToken);

    public FuenteX(
        HttpClient http,
        IOptions<OpcionesIntegraciones> opciones,
        ILogger<FuenteX> log)
    {
        _http = http;
        _opciones = opciones.Value.Social;
        _log = log;
    }

    public async Task<IReadOnlyList<SenalSocial>> BuscarAsync(
        IReadOnlyList<string> terminos, CancellationToken ct = default)
    {
        if (!Disponible)
        {
            _log.LogWarning("X sin Bearer Token configurado. Se omite el monitoreo.");
            return [];
        }

        var senales = new List<SenalSocial>();
        var vistos = new HashSet<string>();

        try
        {
            // Se juntan los términos en una sola consulta con OR: cada llamada
            // consume cuota, y en los planes de X la cuota se acaba rápido.
            var consulta = string.Join(" OR ", terminos.Select(t => $"\"{t}\""));
            consulta += " -is:retweet lang:es";

            var url = $"2/tweets/search/recent" +
                      $"?query={Uri.EscapeDataString(consulta)}" +
                      $"&max_results=25" +
                      $"&tweet.fields=created_at,geo,author_id" +
                      $"&expansions=author_id" +
                      $"&user.fields=username";

            using var peticion = new HttpRequestMessage(HttpMethod.Get, url);
            peticion.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _opciones.XBearerToken);

            var respuesta = await _http.SendAsync(peticion, ct);

            if (respuesta.StatusCode == HttpStatusCode.Forbidden)
            {
                _log.LogError(
                    "X devolvió 403. La búsqueda de publicaciones no está incluida en el " +
                    "plan gratuito: hace falta el plan Basic o superior. " +
                    "Mientras tanto, usa Bluesky cambiando Integraciones:Social:Proveedor a \"Bluesky\".");
                return [];
            }

            if (respuesta.StatusCode == HttpStatusCode.TooManyRequests)
            {
                _log.LogWarning("X devolvió 429: cuota agotada. Se reintenta en el siguiente ciclo.");
                return [];
            }

            if (!respuesta.IsSuccessStatusCode)
            {
                _log.LogWarning("X respondió {Codigo}", respuesta.StatusCode);
                return [];
            }

            var json = await respuesta.Content.ReadAsStringAsync(ct);
            foreach (var senal in Interpretar(json))
            {
                if (vistos.Add(senal.IdExterno)) senales.Add(senal);
            }

            return senales
                .Where(s => s.Relevancia >= 40)
                .OrderByDescending(s => s.Relevancia)
                .ToList();
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Falló el monitoreo en X");
            return [];
        }
    }

    private List<SenalSocial> Interpretar(string json)
    {
        var senales = new List<SenalSocial>();

        using var documento = JsonDocument.Parse(json);
        if (!documento.RootElement.TryGetProperty("data", out var publicaciones))
            return senales;

        // Los nombres de usuario vienen aparte, en "includes".
        var usuarios = new Dictionary<string, string>();
        if (documento.RootElement.TryGetProperty("includes", out var incluidos) &&
            incluidos.TryGetProperty("users", out var listaUsuarios))
        {
            foreach (var usuario in listaUsuarios.EnumerateArray())
            {
                var id = usuario.TryGetProperty("id", out var i) ? i.GetString() : null;
                var nombre = usuario.TryGetProperty("username", out var u) ? u.GetString() : null;
                if (id is not null && nombre is not null) usuarios[id] = nombre;
            }
        }

        foreach (var publicacion in publicaciones.EnumerateArray())
        {
            var texto = publicacion.TryGetProperty("text", out var t) ? t.GetString() : null;
            if (string.IsNullOrWhiteSpace(texto)) continue;

            var id = publicacion.TryGetProperty("id", out var i) ? i.GetString() ?? "" : "";
            var (tipo, municipio, relevancia) = ClasificadorEmergencias.Clasificar(texto);

            string? autor = null;
            if (publicacion.TryGetProperty("author_id", out var autorId))
                usuarios.TryGetValue(autorId.GetString() ?? "", out autor);

            var publicadoEn = DateTime.UtcNow;
            if (publicacion.TryGetProperty("created_at", out var fechaJson) &&
                DateTime.TryParse(fechaJson.GetString(), out var fecha))
                publicadoEn = fecha.ToUniversalTime();

            senales.Add(new SenalSocial(
                Fuente: Nombre,
                IdExterno: id,
                Texto: texto,
                Autor: autor,
                Url: autor is null ? null : $"https://x.com/{autor}/status/{id}",
                PublicadoEn: publicadoEn,
                TipoSugerido: tipo,
                MunicipioDetectado: municipio,
                Relevancia: relevancia));
        }

        return senales;
    }
}
