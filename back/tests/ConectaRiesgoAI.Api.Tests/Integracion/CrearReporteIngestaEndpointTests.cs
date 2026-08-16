using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace ConectaRiesgoAI.Api.Tests.Integracion;

public class CrearReporteIngestaEndpointTests : IClassFixture<ConectaRiesgoAiApiFactory>
{
    private static readonly JsonSerializerOptions JsonOpciones = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly HttpClient _cliente;

    public CrearReporteIngestaEndpointTests(ConectaRiesgoAiApiFactory factory)
    {
        _cliente = factory.CreateClient();
    }

    private static object CuerpoValido() => new
    {
        telefono = "573001234567",
        nombreContacto = "María R.",
        clase = "afectacion_propia",
        tipo = "Inundacion",
        descripcion = "Se inundó la casa",
        ubicacionTexto = "Soacha, Villa Mercedes",
        nivelDano = "Averiada",
        necesidad = "AHE alimentaria",
        urlFoto = (string?)null,
    };

    private HttpContent ContenidoJson(object cuerpo) => JsonContent.Create(cuerpo, options: JsonOpciones);

    [Fact]
    public async Task Post_SinApiKey_Devuelve401()
    {
        HttpResponseMessage respuesta = await _cliente.PostAsync("/api/ingesta/reportes", ContenidoJson(CuerpoValido()));

        Assert.Equal(HttpStatusCode.Unauthorized, respuesta.StatusCode);
        JsonElement cuerpo = await respuesta.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Falta la clave de servicio o no es válida", cuerpo.GetProperty("error").GetString());
    }

    [Fact]
    public async Task Post_ConApiKeyInvalida_Devuelve401()
    {
        HttpRequestMessage peticion = new(HttpMethod.Post, "/api/ingesta/reportes")
        {
            Content = ContenidoJson(CuerpoValido()),
        };
        peticion.Headers.Add("X-Api-Key", "clave-incorrecta");

        HttpResponseMessage respuesta = await _cliente.SendAsync(peticion);

        Assert.Equal(HttpStatusCode.Unauthorized, respuesta.StatusCode);
    }

    [Fact]
    public async Task Post_ConMultiplesCabecerasApiKey_Devuelve401()
    {
        HttpRequestMessage peticion = new(HttpMethod.Post, "/api/ingesta/reportes")
        {
            Content = ContenidoJson(CuerpoValido()),
        };
        peticion.Headers.Add("X-Api-Key", "abc");
        peticion.Headers.Add("X-Api-Key", "def");

        HttpResponseMessage respuesta = await _cliente.SendAsync(peticion);

        Assert.Equal(HttpStatusCode.Unauthorized, respuesta.StatusCode);
    }

    [Fact]
    public async Task Post_ConApiKeyValida_Devuelve201()
    {
        HttpRequestMessage peticion = new(HttpMethod.Post, "/api/ingesta/reportes")
        {
            Content = ContenidoJson(CuerpoValido()),
        };
        peticion.Headers.Add("X-Api-Key", ConectaRiesgoAiApiFactory.ApiKeyIngesta);

        HttpResponseMessage respuesta = await _cliente.SendAsync(peticion);

        Assert.Equal(HttpStatusCode.Created, respuesta.StatusCode);
        JsonElement cuerpo = await respuesta.Content.ReadFromJsonAsync<JsonElement>(JsonOpciones);
        Assert.StartsWith("RPT-", cuerpo.GetProperty("codigo").GetString());
    }
}
