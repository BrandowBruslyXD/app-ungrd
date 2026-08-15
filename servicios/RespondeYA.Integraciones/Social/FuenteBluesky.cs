using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RespondeYA.Integraciones.Configuracion;
using RespondeYA.Integraciones.Modelos;

namespace RespondeYA.Integraciones.Social;

/// <summary>
/// Monitoreo de emergencias en Bluesky (protocolo AT).
///
/// POR QUÉ BLUESKY Y NO X: buscar publicaciones en Bluesky es gratis y solo pide
/// una cuenta normal más una contraseña de aplicación, que se genera en un minuto.
/// La API de X exige un plan de pago de cientos de dólares al mes para poder
/// buscar; su plan gratuito solo permite publicar, no leer.
///
/// Es cierto que en Colombia hay más conversación de emergencias en X que en
/// Bluesky. Para el hackathon eso no impide demostrar la capacidad: el sistema
/// ingiere, clasifica y geolocaliza señales sociales, y la fuente es
/// intercambiable. Si consigues acceso de pago a X, se cambia una línea.
/// </summary>
public class FuenteBluesky : IFuenteSocial
{
    private readonly HttpClient _http;
    private readonly OpcionesSocial _opciones;
    private readonly ILogger<FuenteBluesky> _log;

    private string? _token;
    private DateTime _tokenExpira = DateTime.MinValue;

    public string Nombre => "Bluesky";

    public bool Disponible =>
        !string.IsNullOrWhiteSpace(_opciones.BlueskyIdentificador) &&
        !string.IsNullOrWhiteSpace(_opciones.BlueskyPassword);

    public FuenteBluesky(
        HttpClient http,
        IOptions<OpcionesIntegraciones> opciones,
        ILogger<FuenteBluesky> log)
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
            _log.LogWarning("Bluesky sin credenciales. Se omite el monitoreo social.");
            return [];
        }

        try
        {
            if (!await AutenticarAsync(ct)) return [];

            var senales = new List<SenalSocial>();
            var vistos = new HashSet<string>();

            foreach (var termino in terminos)
            {
                var url = $"xrpc/app.bsky.feed.searchPosts?q={Uri.EscapeDataString(termino)}&limit=25";

                using var peticion = new HttpRequestMessage(HttpMethod.Get, url);
                peticion.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _token);

                var respuesta = await _http.SendAsync(peticion, ct);
                if (!respuesta.IsSuccessStatusCode)
                {
                    _log.LogWarning("Bluesky respondió {Codigo} para «{Termino}»",
                        respuesta.StatusCode, termino);
                    continue;
                }

                var json = await respuesta.Content.ReadAsStringAsync(ct);
                foreach (var senal in Interpretar(json))
                {
                    // Una misma publicación aparece en varias búsquedas.
                    if (vistos.Add(senal.IdExterno)) senales.Add(senal);
                }
            }

            // Solo lo que el clasificador considera realmente relevante.
            return senales
                .Where(s => s.Relevancia >= 40)
                .OrderByDescending(s => s.Relevancia)
                .ThenByDescending(s => s.PublicadoEn)
                .ToList();
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Falló el monitoreo en Bluesky");
            return [];
        }
    }

    private async Task<bool> AutenticarAsync(CancellationToken ct)
    {
        if (_token is not null && DateTime.UtcNow < _tokenExpira) return true;

        var cuerpo = new
        {
            identifier = _opciones.BlueskyIdentificador,
            password = _opciones.BlueskyPassword
        };

        var respuesta = await _http.PostAsJsonAsync("xrpc/com.atproto.server.createSession", cuerpo, ct);
        if (!respuesta.IsSuccessStatusCode)
        {
            _log.LogError("No se pudo iniciar sesión en Bluesky: {Codigo}. " +
                          "Revisa que sea una contraseña de APLICACIÓN, no la de la cuenta.",
                respuesta.StatusCode);
            return false;
        }

        var json = await respuesta.Content.ReadAsStringAsync(ct);
        using var documento = JsonDocument.Parse(json);

        _token = documento.RootElement.GetProperty("accessJwt").GetString();

        // El token dura más, pero se renueva cada hora por seguridad.
        _tokenExpira = DateTime.UtcNow.AddHours(1);
        return _token is not null;
    }

    private List<SenalSocial> Interpretar(string json)
    {
        var senales = new List<SenalSocial>();

        using var documento = JsonDocument.Parse(json);
        if (!documento.RootElement.TryGetProperty("posts", out var publicaciones))
            return senales;

        foreach (var publicacion in publicaciones.EnumerateArray())
        {
            if (!publicacion.TryGetProperty("record", out var registro)) continue;
            if (!registro.TryGetProperty("text", out var textoJson)) continue;

            var texto = textoJson.GetString();
            if (string.IsNullOrWhiteSpace(texto)) continue;

            var (tipo, municipio, relevancia) = ClasificadorEmergencias.Clasificar(texto);

            var uri = publicacion.TryGetProperty("uri", out var u) ? u.GetString() ?? "" : "";
            var autor = publicacion.TryGetProperty("author", out var a) &&
                        a.TryGetProperty("handle", out var h) ? h.GetString() : null;

            var publicadoEn = DateTime.UtcNow;
            if (registro.TryGetProperty("createdAt", out var fechaJson) &&
                DateTime.TryParse(fechaJson.GetString(), out var fecha))
                publicadoEn = fecha.ToUniversalTime();

            senales.Add(new SenalSocial(
                Fuente: Nombre,
                IdExterno: uri,
                Texto: texto,
                Autor: autor,
                Url: ConstruirEnlace(uri, autor),
                PublicadoEn: publicadoEn,
                TipoSugerido: tipo,
                MunicipioDetectado: municipio,
                Relevancia: relevancia));
        }

        return senales;
    }

    /// <summary>
    /// Convierte un URI del protocolo AT (at://did:plc:xxx/app.bsky.feed.post/yyy)
    /// en un enlace que se puede abrir en el navegador.
    /// </summary>
    private static string? ConstruirEnlace(string uri, string? autor)
    {
        if (string.IsNullOrWhiteSpace(autor) || string.IsNullOrWhiteSpace(uri)) return null;

        var id = uri.Split('/').LastOrDefault();
        return string.IsNullOrWhiteSpace(id) ? null : $"https://bsky.app/profile/{autor}/post/{id}";
    }
}
