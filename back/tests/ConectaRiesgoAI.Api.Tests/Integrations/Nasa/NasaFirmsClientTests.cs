using System.Net;
using ConectaRiesgoAI.Api.Integrations.Nasa;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace ConectaRiesgoAI.Api.Tests.Integrations.Nasa;

public class NasaFirmsClientTests
{
    // Bogotá, usada en todos los casos: las coordenadas exactas no importan para estas pruebas.
    private const double Lat = 4.710989;
    private const double Lng = -74.072092;
    private const double RadioKm = 5;

    private static NasaFirmsClient Crear(HttpMessageHandler handler, NasaOptions? opciones = null)
    {
        var httpClient = new HttpClient(handler) { BaseAddress = new Uri("https://firms.modaps.eosdis.nasa.gov/") };
        return new NasaFirmsClient(
            httpClient,
            Options.Create(opciones ?? new NasaOptions { ApiKey = "clave-de-prueba" }),
            NullLogger<NasaFirmsClient>.Instance);
    }

    [Fact]
    public async Task ConsultarFocosDeCalorAsync_SinMapKeyConfigurada_NoLlamaAlHttpClientYDevuelveNull()
    {
        var handler = new HandlerDeRespuestaFija(HttpStatusCode.OK, "");
        var cliente = Crear(handler, new NasaOptions { ApiKey = "" });

        var resultado = await cliente.ConsultarFocosDeCalorAsync(Lat, Lng, RadioKm, CancellationToken.None);

        Assert.Null(resultado);
        Assert.Equal(0, handler.VecesLlamado);
    }

    [Fact]
    public async Task ConsultarFocosDeCalorAsync_FirmsDevuelveFocosDentroDelRadio_DevuelveConfirmadoConElConteo()
    {
        const string cuerpo = """
            latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight
            4.715,-74.070,320.1,0.4,0.4,2026-08-15,1830,N,VIIRS,n,2.0NRT,290.2,12.3,D
            4.900,-74.900,310.5,0.4,0.4,2026-08-15,1830,N,VIIRS,h,2.0NRT,285.0,8.1,D
            """;
        var cliente = Crear(new HandlerDeRespuestaFija(HttpStatusCode.OK, cuerpo));

        var resultado = await cliente.ConsultarFocosDeCalorAsync(Lat, Lng, RadioKm, CancellationToken.None);

        Assert.NotNull(resultado);
        Assert.True(resultado!.Confirmado);
        // El segundo foco está a ~90 km, fuera del radio de 5 km: se descarta aunque venga en la respuesta.
        Assert.Equal(1, resultado.FocosDetectados);
        Assert.NotNull(resultado.DistanciaMasCercanaKm);
        Assert.True(resultado.DistanciaMasCercanaKm <= RadioKm);
    }

    [Fact]
    public async Task ConsultarFocosDeCalorAsync_FirmsDevuelveSoloElEncabezado_DevuelveNoConfirmado()
    {
        const string cuerpo = "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight";
        var cliente = Crear(new HandlerDeRespuestaFija(HttpStatusCode.OK, cuerpo));

        var resultado = await cliente.ConsultarFocosDeCalorAsync(Lat, Lng, RadioKm, CancellationToken.None);

        Assert.NotNull(resultado);
        Assert.False(resultado!.Confirmado);
        Assert.Equal(0, resultado.FocosDetectados);
        Assert.Null(resultado.DistanciaMasCercanaKm);
    }

    /// <summary>
    /// Camino que falla: FIRMS devuelve "Invalid MAP_KEY" como texto plano con 200 OK — una
    /// rareza documentada de su API. No tiene columnas latitude/longitude: se trata como falla
    /// (null), no como "sin focos", para no cachear un resultado que en realidad no se consultó.
    /// </summary>
    [Fact]
    public async Task ConsultarFocosDeCalorAsync_FirmsDevuelveMapKeyInvalida_DevuelveNull()
    {
        var cliente = Crear(new HandlerDeRespuestaFija(HttpStatusCode.OK, "Invalid MAP_KEY"));

        var resultado = await cliente.ConsultarFocosDeCalorAsync(Lat, Lng, RadioKm, CancellationToken.None);

        Assert.Null(resultado);
    }

    [Fact]
    public async Task ConsultarFocosDeCalorAsync_FirmsResponde500_DevuelveNull()
    {
        var cliente = Crear(new HandlerDeRespuestaFija(HttpStatusCode.InternalServerError, "error"));

        var resultado = await cliente.ConsultarFocosDeCalorAsync(Lat, Lng, RadioKm, CancellationToken.None);

        Assert.Null(resultado);
    }

    /// <summary>Camino que falla: FIRMS no responde a tiempo (excepción de red/timeout).</summary>
    [Fact]
    public async Task ConsultarFocosDeCalorAsync_FirmsLanzaExcepcionDeRed_NoPropagaYDevuelveNull()
    {
        var cliente = Crear(new HandlerQueLanza(new HttpRequestException("timeout simulado")));

        var resultado = await cliente.ConsultarFocosDeCalorAsync(Lat, Lng, RadioKm, CancellationToken.None);

        Assert.Null(resultado);
    }

    [Fact]
    public async Task ConsultarFocosDeCalorAsync_CancellationTokenPropioCancelado_Propaga()
    {
        using var cts = new CancellationTokenSource();
        var cliente = Crear(new HandlerQueCancelaYLanza(cts));

        await Assert.ThrowsAsync<OperationCanceledException>(
            () => cliente.ConsultarFocosDeCalorAsync(Lat, Lng, RadioKm, cts.Token));
    }

    private class HandlerDeRespuestaFija(HttpStatusCode codigo, string cuerpo) : HttpMessageHandler
    {
        public int VecesLlamado { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            VecesLlamado++;
            return Task.FromResult(new HttpResponseMessage(codigo)
            {
                Content = new StringContent(cuerpo, System.Text.Encoding.UTF8, "text/csv")
            });
        }
    }

    private class HandlerQueLanza(Exception excepcion) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) =>
            throw excepcion;
    }

    private class HandlerQueCancelaYLanza(CancellationTokenSource cts) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            cts.Cancel();
            throw new OperationCanceledException(cts.Token);
        }
    }
}
