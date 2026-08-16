using System.Net;
using ConectaRiesgoAI.Api.Integrations.Secop;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace ConectaRiesgoAI.Api.Tests.Integrations.Secop;

public class SecopClientTests
{
    private static SecopClient Crear(HttpMessageHandler handler, SecopOptions? opciones = null)
    {
        var httpClient = new HttpClient(handler) { BaseAddress = new Uri("https://www.datos.gov.co/") };
        return new SecopClient(
            httpClient,
            new MemoryCache(new MemoryCacheOptions { SizeLimit = 500 }),
            Options.Create(opciones ?? new SecopOptions()),
            NullLogger<SecopClient>.Instance);
    }

    [Fact]
    public async Task ConsultarPorMunicipioAsync_SecopResponde200ConDatos_DevuelveLosContratosMapeados()
    {
        const string cuerpo = """
            [
              {
                "objeto_del_contrato": "Obras de canalización quebrada La Vieja",
                "valor_del_contrato": "450000000",
                "fecha_de_firma": "2024-03-10T00:00:00.000",
                "nombre_entidad": "Alcaldía de Bogotá"
              }
            ]
            """;
        var cliente = Crear(new HandlerDeRespuestaFija(HttpStatusCode.OK, cuerpo));

        var resultado = await cliente.ConsultarPorMunicipioAsync("Bogotá", CancellationToken.None);

        var contrato = Assert.Single(resultado);
        Assert.Equal("Obras de canalización quebrada La Vieja", contrato.Objeto);
        Assert.Equal(450_000_000m, contrato.Valor);
        Assert.Equal(2024, contrato.Anio);
        Assert.Equal("Alcaldía de Bogotá", contrato.Entidad);
    }

    /// <summary>
    /// Camino que falla: SECOP responde con error HTTP. El cliente nunca debe propagar la
    /// excepción — con respaldo activo, cae a los datos pregrabados del municipio de demo.
    /// </summary>
    [Fact]
    public async Task ConsultarPorMunicipioAsync_SecopResponde500_UsaElRespaldoDelMunicipio()
    {
        var cliente = Crear(
            new HandlerDeRespuestaFija(HttpStatusCode.InternalServerError, "error"),
            new SecopOptions { UsarRespaldoSiFalla = true });

        var resultado = await cliente.ConsultarPorMunicipioAsync("Bogotá", CancellationToken.None);

        Assert.NotEmpty(resultado);
        Assert.All(resultado, c => Assert.False(string.IsNullOrWhiteSpace(c.Objeto)));
    }

    /// <summary>Camino que falla: SECOP no responde a tiempo (excepción de red/timeout).</summary>
    [Fact]
    public async Task ConsultarPorMunicipioAsync_SecopLanzaExcepcionDeRed_NoPropagaYDevuelveRespaldo()
    {
        var cliente = Crear(
            new HandlerQueLanza(new HttpRequestException("timeout simulado")),
            new SecopOptions { UsarRespaldoSiFalla = true });

        var resultado = await cliente.ConsultarPorMunicipioAsync("Bogotá", CancellationToken.None);

        Assert.NotEmpty(resultado);
    }

    [Fact]
    public async Task ConsultarPorMunicipioAsync_SecopFallaSinRespaldoActivado_DevuelveListaVacia()
    {
        var cliente = Crear(
            new HandlerQueLanza(new HttpRequestException("timeout simulado")),
            new SecopOptions { UsarRespaldoSiFalla = false });

        var resultado = await cliente.ConsultarPorMunicipioAsync("Bogotá", CancellationToken.None);

        Assert.Empty(resultado);
    }

    /// <summary>
    /// Camino que falla: un ciudadano escribe "Bogota" sin tilde (muy común desde el teléfono o
    /// por WhatsApp). Sin normalizar, el respaldo pregrabado para "Bogotá" no haría match y el
    /// bloque de transparencia desaparecería en silencio para el municipio insignia de la demo.
    /// </summary>
    [Fact]
    public async Task ConsultarPorMunicipioAsync_MunicipioSinTildeYSecopFalla_UsaElRespaldoDeTodosModos()
    {
        var cliente = Crear(
            new HandlerQueLanza(new HttpRequestException("timeout simulado")),
            new SecopOptions { UsarRespaldoSiFalla = true });

        var resultado = await cliente.ConsultarPorMunicipioAsync("bogota", CancellationToken.None);

        Assert.NotEmpty(resultado);
    }

    [Fact]
    public async Task ConsultarPorMunicipioAsync_MunicipioSinDatosDeRespaldoYSecopFalla_DevuelveListaVacia()
    {
        var cliente = Crear(
            new HandlerQueLanza(new HttpRequestException("timeout simulado")),
            new SecopOptions { UsarRespaldoSiFalla = true });

        var resultado = await cliente.ConsultarPorMunicipioAsync("Municipio Inventado", CancellationToken.None);

        Assert.Empty(resultado);
    }

    [Fact]
    public async Task ConsultarPorMunicipioAsync_SegundaConsultaDelMismoMunicipio_NoVuelveALlamarAlHttpClient()
    {
        var handler = new HandlerDeRespuestaFija(HttpStatusCode.OK, "[]");
        var cliente = Crear(handler);

        await cliente.ConsultarPorMunicipioAsync("Bogotá", CancellationToken.None);
        await cliente.ConsultarPorMunicipioAsync("Bogotá", CancellationToken.None);

        Assert.Equal(1, handler.VecesLlamado);
    }

    [Fact]
    public async Task ConsultarPorMunicipioAsync_MismoMunicipioConDistintaGrafia_ComparteLaMismaEntradaDeCache()
    {
        var handler = new HandlerDeRespuestaFija(HttpStatusCode.OK, "[]");
        var cliente = Crear(handler);

        await cliente.ConsultarPorMunicipioAsync("bogota", CancellationToken.None);
        await cliente.ConsultarPorMunicipioAsync("  Bogotá  ", CancellationToken.None);

        Assert.Equal(1, handler.VecesLlamado);
    }

    [Fact]
    public async Task ConsultarPorMunicipioAsync_SecopResponde200ConRegistrosInvalidos_DevuelveListaVaciaSinRespaldo()
    {
        const string cuerpo = """
            [
              { "objeto_del_contrato": "", "valor_del_contrato": "x", "fecha_de_firma": "2024-01-01", "nombre_entidad": "Entidad" },
              { "objeto_del_contrato": "Obra válida", "valor_del_contrato": "no-numero", "fecha_de_firma": "2024-01-01", "nombre_entidad": "Entidad" }
            ]
            """;
        var cliente = Crear(
            new HandlerDeRespuestaFija(HttpStatusCode.OK, cuerpo),
            new SecopOptions { UsarRespaldoSiFalla = false });

        var resultado = await cliente.ConsultarPorMunicipioAsync("Bogotá", CancellationToken.None);

        Assert.Empty(resultado);
    }

    [Fact]
    public async Task ConsultarPorMunicipioAsync_SecopResponde200ConRegistrosInvalidos_UsaElRespaldoDelMunicipio()
    {
        const string cuerpo = """
            [
              { "objeto_del_contrato": "", "valor_del_contrato": "x", "fecha_de_firma": "2024-01-01", "nombre_entidad": "Entidad" },
              { "objeto_del_contrato": "Obra válida", "valor_del_contrato": "no-numero", "fecha_de_firma": "2024-01-01", "nombre_entidad": "Entidad" }
            ]
            """;
        var cliente = Crear(
            new HandlerDeRespuestaFija(HttpStatusCode.OK, cuerpo),
            new SecopOptions { UsarRespaldoSiFalla = true });

        var resultado = await cliente.ConsultarPorMunicipioAsync("Bogotá", CancellationToken.None);

        Assert.Equal(3, resultado.Count);
        Assert.All(resultado, c => Assert.Equal("Alcaldía de Bogotá", c.Entidad));
        Assert.All(resultado, c => Assert.False(string.IsNullOrWhiteSpace(c.Objeto)));
    }

    [Fact]
    public async Task ConsultarPorMunicipioAsync_CancelacionDelCaller_PropagaOperationCanceledException()
    {
        var cliente = Crear(new HandlerQueEsperaInfinito());
        using CancellationTokenSource cts = new();
        cts.Cancel();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(
            () => cliente.ConsultarPorMunicipioAsync("Bogotá", cts.Token));
    }

    [Fact]
    public async Task ConsultarPorMunicipioAsync_ConAppToken_EnviaLaCabeceraXAppToken()
    {
        var handler = new HandlerDeRespuestaFija(HttpStatusCode.OK, "[]");
        var cliente = Crear(handler, new SecopOptions { AppToken = "token-secreto" });

        await cliente.ConsultarPorMunicipioAsync("Bogotá", CancellationToken.None);

        Assert.Equal("token-secreto", handler.XAppTokenCapturado);
    }

    private class HandlerQueEsperaInfinito : HttpMessageHandler
    {
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            await Task.Delay(Timeout.Infinite, cancellationToken);
            return new HttpResponseMessage(HttpStatusCode.OK);
        }
    }

    private class HandlerDeRespuestaFija(HttpStatusCode codigo, string cuerpo) : HttpMessageHandler
    {
        public int VecesLlamado { get; private set; }
        public HttpRequestMessage? UltimaPeticion { get; private set; }
        public string? XAppTokenCapturado { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            VecesLlamado++;
            UltimaPeticion = request;
            XAppTokenCapturado = request.Headers.TryGetValues("X-App-Token", out IEnumerable<string>? valores)
                ? valores.FirstOrDefault()
                : null;
            return Task.FromResult(new HttpResponseMessage(codigo)
            {
                Content = new StringContent(cuerpo, System.Text.Encoding.UTF8, "application/json")
            });
        }
    }

    private class HandlerQueLanza(Exception excepcion) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) =>
            throw excepcion;
    }
}
