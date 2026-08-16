using ConectaRiesgoAI.Api.Features.Verificacion.VerificacionSatelital;
using ConectaRiesgoAI.Api.Integrations.Nasa;
using ConectaRiesgoAI.Api.Tests.Integrations.Nasa;

namespace ConectaRiesgoAI.Api.Tests.Features.Verificacion;

public class VerificacionSatelitalHandlerTests
{
    [Fact]
    public async Task Handle_ClienteDevuelveFocosDeCalor_LosMapeaAlDtoDeSalida()
    {
        var resultado = new ResultadoVerificacionSatelital(true, 3, 2.1, "3 focos de calor detectados a menos de 5 km");
        var handler = new VerificacionSatelitalHandler(new NasaFirmsClientFalso(resultado));

        var respuesta = await handler.Handle(new VerificacionSatelitalQuery(4.71, -74.07, 5), CancellationToken.None);

        Assert.NotNull(respuesta);
        Assert.Equal("NASA FIRMS", respuesta!.Fuente);
        Assert.True(respuesta.Confirmado);
        Assert.Equal(3, respuesta.FocosDetectados);
        Assert.Equal(2.1, respuesta.DistanciaMasCercanaKm);
        Assert.Equal("3 focos de calor detectados a menos de 5 km", respuesta.Detalle);
    }

    /// <summary>
    /// El cliente NASA FIRMS nunca lanza (garantía de <see cref="INasaFirmsClient"/>): cuando la
    /// integración falla o no hay MAP_KEY configurada, lo que llega al handler es <c>null</c>, no
    /// una excepción. El handler debe seguir respondiendo 200 con cuerpo <c>null</c>.
    /// </summary>
    [Fact]
    public async Task Handle_ClienteSinResultado_DevuelveNullSinRomper()
    {
        var handler = new VerificacionSatelitalHandler(new NasaFirmsClientFalso());

        var respuesta = await handler.Handle(new VerificacionSatelitalQuery(4.71, -74.07, 5), CancellationToken.None);

        Assert.Null(respuesta);
    }
}
