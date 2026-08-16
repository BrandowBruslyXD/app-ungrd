using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using ConectaRiesgoAI.Api.Domain.Enums;
using ConectaRiesgoAI.Api.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ConectaRiesgoAI.Api.Tests.Integracion;

/// <summary>Ejercita los endpoints HTTP de punta a punta con el host de prueba.</summary>
public class ApiEndpointsIntegrationTests : IClassFixture<ConectaRiesgoAiApiFactory>
{
    private static readonly JsonSerializerOptions JsonOpciones = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly ConectaRiesgoAiApiFactory _factory;
    private readonly HttpClient _cliente;

    public ApiEndpointsIntegrationTests(ConectaRiesgoAiApiFactory factory)
    {
        _factory = factory;
        _cliente = factory.CreateClient();
    }

    private static string EmailUnico() => $"usuario-{Guid.NewGuid():N}@conectariesgoai.demo";

    private async Task<string> RegistrarYLoginAsync(string? email = null, string password = "Password123!")
    {
        string correo = email ?? EmailUnico();
        HttpResponseMessage registro = await _cliente.PostAsJsonAsync("/api/auth/registro", new
        {
            nombre = "Ana Ciudadana",
            email = correo,
            password,
            municipio = "Bogotá"
        }, JsonOpciones);
        registro.EnsureSuccessStatusCode();

        HttpResponseMessage login = await _cliente.PostAsJsonAsync("/api/auth/login", new
        {
            email = correo,
            password
        }, JsonOpciones);
        login.EnsureSuccessStatusCode();

        JsonElement cuerpo = await login.Content.ReadFromJsonAsync<JsonElement>(JsonOpciones);
        return cuerpo.GetProperty("token").GetString()!;
    }

    private async Task<string> LoginAsync(string email, string password = "Password123!")
    {
        HttpResponseMessage login = await _cliente.PostAsJsonAsync("/api/auth/login", new
        {
            email,
            password
        }, JsonOpciones);
        login.EnsureSuccessStatusCode();
        JsonElement cuerpo = await login.Content.ReadFromJsonAsync<JsonElement>(JsonOpciones);
        return cuerpo.GetProperty("token").GetString()!;
    }

    private HttpRequestMessage ConToken(HttpMethod metodo, string ruta, string token, HttpContent? contenido = null)
    {
        HttpRequestMessage peticion = new(metodo, ruta) { Content = contenido };
        peticion.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return peticion;
    }

    [Fact]
    public async Task Health_DevuelveOkEnAmbasRutas()
    {
        foreach (string ruta in new[] { "/health", "/api/health" })
        {
            HttpResponseMessage respuesta = await _cliente.GetAsync(ruta);
            respuesta.EnsureSuccessStatusCode();
            JsonElement cuerpo = await respuesta.Content.ReadFromJsonAsync<JsonElement>();
            Assert.Equal("ok", cuerpo.GetProperty("estado").GetString());
            Assert.Equal("ConectaRiesgoAI", cuerpo.GetProperty("servicio").GetString());
        }
    }

    [Fact]
    public async Task Auth_RegistroLoginYObtenerPerfil_FuncionanConJwt()
    {
        string token = await RegistrarYLoginAsync();

        HttpResponseMessage perfil = await _cliente.SendAsync(ConToken(HttpMethod.Get, "/api/auth/yo", token));
        perfil.EnsureSuccessStatusCode();
        JsonElement dto = await perfil.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Ana Ciudadana", dto.GetProperty("nombre").GetString());
    }

    [Fact]
    public async Task Auth_LoginConCredencialesInvalidas_Devuelve401()
    {
        HttpResponseMessage respuesta = await _cliente.PostAsJsonAsync("/api/auth/login", new
        {
            email = "noexiste@conectariesgoai.demo",
            password = "mal"
        }, JsonOpciones);

        Assert.Equal(HttpStatusCode.Unauthorized, respuesta.StatusCode);
    }

    [Fact]
    public async Task Reportes_FlujoCompletoCiudadano_CreaListaDetalleYMisReportes()
    {
        string token = await RegistrarYLoginAsync();

        HttpResponseMessage crear = await _cliente.SendAsync(ConToken(
            HttpMethod.Post,
            "/api/reportes",
            token,
            JsonContent.Create(new
            {
                tipo = "Inundacion",
                descripcion = "Se está inundando la vía principal",
                latitud = 4.710989,
                longitud = -74.072092,
                municipio = "Bogotá"
            }, options: JsonOpciones)));
        Assert.Equal(HttpStatusCode.Created, crear.StatusCode);

        JsonElement creado = await crear.Content.ReadFromJsonAsync<JsonElement>(JsonOpciones);
        string codigo = creado.GetProperty("codigo").GetString()!;

        HttpResponseMessage listar = await _cliente.GetAsync("/api/reportes");
        listar.EnsureSuccessStatusCode();
        JsonElement lista = await listar.Content.ReadFromJsonAsync<JsonElement>(JsonOpciones);
        Assert.True(lista.GetArrayLength() >= 1);

        HttpResponseMessage detalle = await _cliente.GetAsync($"/api/reportes/{codigo}");
        detalle.EnsureSuccessStatusCode();
        JsonElement reporte = await detalle.Content.ReadFromJsonAsync<JsonElement>(JsonOpciones);
        Assert.Equal(codigo, reporte.GetProperty("codigo").GetString());

        HttpResponseMessage mios = await _cliente.SendAsync(ConToken(HttpMethod.Get, "/api/reportes/mios", token));
        mios.EnsureSuccessStatusCode();
        JsonElement misReportes = await mios.Content.ReadFromJsonAsync<JsonElement>(JsonOpciones);
        Assert.Contains(misReportes.EnumerateArray(), r => r.GetProperty("codigo").GetString() == codigo);
    }

    [Fact]
    public async Task Reportes_SinToken_Devuelve401()
    {
        HttpResponseMessage respuesta = await _cliente.PostAsJsonAsync("/api/reportes", new
        {
            tipo = "Inundacion",
            descripcion = "Prueba",
            latitud = 4.71,
            longitud = -74.07,
            municipio = "Bogotá"
        }, JsonOpciones);

        Assert.Equal(HttpStatusCode.Unauthorized, respuesta.StatusCode);
    }

    [Fact]
    public async Task Reportes_CodigoInexistente_Devuelve404()
    {
        HttpResponseMessage respuesta = await _cliente.GetAsync("/api/reportes/RPT-NO-EXISTE");

        Assert.Equal(HttpStatusCode.NotFound, respuesta.StatusCode);
    }

    [Fact]
    public async Task Reportes_ActualizarEstadoComoGestor_AvanzaLaCronologia()
    {
        string email = EmailUnico();
        string tokenCiudadano = await RegistrarYLoginAsync(email);

        HttpResponseMessage crear = await _cliente.SendAsync(ConToken(
            HttpMethod.Post,
            "/api/reportes",
            tokenCiudadano,
            JsonContent.Create(new
            {
                tipo = "Incendio",
                descripcion = "Humo visible en el cerro",
                latitud = 4.65,
                longitud = -74.05,
                municipio = "Bogotá"
            }, options: JsonOpciones)));
        crear.EnsureSuccessStatusCode();
        string codigo = (await crear.Content.ReadFromJsonAsync<JsonElement>(JsonOpciones))
            .GetProperty("codigo").GetString()!;

        using (IServiceScope scope = _factory.Services.CreateScope())
        {
            AppDbContext db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            Domain.Entities.Usuario usuario = await db.Usuarios.SingleAsync(u => u.Email == email);
            usuario.Rol = Rol.Gestor;
            await db.SaveChangesAsync();
        }

        string tokenGestor = await LoginAsync(email);
        HttpResponseMessage patch = await _cliente.SendAsync(ConToken(
            HttpMethod.Patch,
            $"/api/reportes/{codigo}/estado",
            tokenGestor,
            JsonContent.Create(new { estado = "Verificado", nota = "Confirmado por el gestor" }, options: JsonOpciones)));
        patch.EnsureSuccessStatusCode();

        JsonElement actualizado = await patch.Content.ReadFromJsonAsync<JsonElement>(JsonOpciones);
        Assert.Equal("Verificado", actualizado.GetProperty("estado").GetString());
    }

    [Fact]
    public async Task Reportes_ActualizarEstadoComoCiudadano_Devuelve403()
    {
        string token = await RegistrarYLoginAsync();

        HttpResponseMessage crear = await _cliente.SendAsync(ConToken(
            HttpMethod.Post,
            "/api/reportes",
            token,
            JsonContent.Create(new
            {
                tipo = "Otro",
                descripcion = "Prueba de permisos",
                latitud = 4.71,
                longitud = -74.07,
                municipio = "Bogotá"
            }, options: JsonOpciones)));
        crear.EnsureSuccessStatusCode();
        string codigo = (await crear.Content.ReadFromJsonAsync<JsonElement>(JsonOpciones))
            .GetProperty("codigo").GetString()!;

        HttpResponseMessage patch = await _cliente.SendAsync(ConToken(
            HttpMethod.Patch,
            $"/api/reportes/{codigo}/estado",
            token,
            JsonContent.Create(new { estado = "Verificado", nota = "No debería permitirse" }, options: JsonOpciones)));

        Assert.Equal(HttpStatusCode.Forbidden, patch.StatusCode);
    }

    [Fact]
    public async Task Estadisticas_ResumenPublico_DevuelveConteos()
    {
        HttpResponseMessage respuesta = await _cliente.GetAsync("/api/estadisticas/resumen");
        respuesta.EnsureSuccessStatusCode();
        JsonElement cuerpo = await respuesta.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(cuerpo.TryGetProperty("totalHoy", out _));
    }

    [Fact]
    public async Task Transparencia_SecopPublico_RespondeSinAutenticacion()
    {
        HttpResponseMessage respuesta = await _cliente.GetAsync("/api/transparencia/secop?municipio=Bogot%C3%A1");
        respuesta.EnsureSuccessStatusCode();
        JsonElement cuerpo = await respuesta.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(JsonValueKind.Array, cuerpo.ValueKind);
    }

    [Fact]
    public async Task Evidencias_SubirSinToken_Devuelve401()
    {
        using MultipartFormDataContent contenido = new();
        contenido.Add(new ByteArrayContent([0xFF, 0xD8, 0xFF]), "archivo", "foto.jpg");
        contenido.Add(new StringContent("DanoMaterial"), "tipo");

        HttpResponseMessage respuesta = await _cliente.PostAsync("/api/evidencias", contenido);
        Assert.Equal(HttpStatusCode.Unauthorized, respuesta.StatusCode);
    }

    [Fact]
    public async Task Evidencias_SubirConToken_Responde200EsteONoDisponibleElAlmacenamiento()
    {
        /*
         * Antes esta prueba afirmaba que `subida` era false, dando por hecho que Azure no
         * estaba disponible. Eso la ataba al entorno: en una maquina con Azurite corriendo
         * la subida si funciona y la prueba caia, aunque el codigo estuviera perfecto.
         *
         * Lo que de verdad hay que sostener es que subir una evidencia nunca tumba la
         * peticion: responde 200 y dice en `subida` si el archivo quedo guardado o no. El
         * ciudadano que reporta con mala señal no puede perder el reporte entero porque el
         * almacenamiento este caido.
         */
        string token = await RegistrarYLoginAsync();
        using MultipartFormDataContent contenido = new();
        ByteArrayContent bytes = new([0xFF, 0xD8, 0xFF]);
        bytes.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        contenido.Add(bytes, "archivo", "foto.jpg");
        contenido.Add(new StringContent("DanoMaterial"), "tipo");

        HttpResponseMessage respuesta = await _cliente.SendAsync(ConToken(HttpMethod.Post, "/api/evidencias", token, contenido));

        JsonElement cuerpo = await respuesta.Content.ReadFromJsonAsync<JsonElement>();
        bool subida = cuerpo.GetProperty("subida").GetBoolean();

        // Nunca falla la peticion; lo que cambia es el codigo y si trae URL.
        if (subida)
        {
            Assert.Equal(HttpStatusCode.Created, respuesta.StatusCode);
            Assert.False(string.IsNullOrWhiteSpace(cuerpo.GetProperty("urlFoto").GetString()));
        }
        else
        {
            Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
            Assert.Equal(JsonValueKind.Null, cuerpo.GetProperty("urlFoto").ValueKind);
        }
    }

    [Fact]
    public async Task Ingesta_ObtenerReporteCreadoPorBot_DevuelveDetalle()
    {
        HttpRequestMessage crear = new(HttpMethod.Post, "/api/ingesta/reportes")
        {
            Content = JsonContent.Create(new
            {
                telefono = "573009998877",
                nombreContacto = "Pedro L.",
                clase = "aviso_evento",
                tipo = "Incendio",
                descripcion = "Se ve humo en la montaña",
                ubicacionTexto = "Medellín, comuna 13",
                nivelDano = (string?)null,
                necesidad = (string?)null,
                urlFoto = (string?)null,
            }, options: JsonOpciones)
        };
        crear.Headers.Add("X-Api-Key", ConectaRiesgoAiApiFactory.ApiKeyIngesta);

        HttpResponseMessage respuestaCrear = await _cliente.SendAsync(crear);
        respuestaCrear.EnsureSuccessStatusCode();
        string codigo = (await respuestaCrear.Content.ReadFromJsonAsync<JsonElement>(JsonOpciones))
            .GetProperty("codigo").GetString()!;

        HttpResponseMessage detalle = await _cliente.GetAsync($"/api/ingesta/reportes/{codigo}");
        detalle.EnsureSuccessStatusCode();
        JsonElement reporte = await detalle.Content.ReadFromJsonAsync<JsonElement>(JsonOpciones);
        Assert.Equal(codigo, reporte.GetProperty("codigo").GetString());
        Assert.False(string.IsNullOrWhiteSpace(reporte.GetProperty("estado").GetString()));
        Assert.False(string.IsNullOrWhiteSpace(reporte.GetProperty("detalle").GetString()));
    }

    [Fact]
    public async Task Validacion_RegistroConEmailInvalido_Devuelve400()
    {
        HttpResponseMessage respuesta = await _cliente.PostAsJsonAsync("/api/auth/registro", new
        {
            nombre = "Test",
            email = "no-es-email",
            password = "Password123!",
            municipio = "Bogotá"
        }, JsonOpciones);

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
        JsonElement cuerpo = await respuesta.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Datos inválidos", cuerpo.GetProperty("error").GetString());
    }
}
