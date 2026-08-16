using ConectaRiesgoAI.Api.Features.Transparencia.ContratosSecop;
using ConectaRiesgoAI.Api.Integrations.Secop;
using ConectaRiesgoAI.Api.Tests.Integrations.Secop;

namespace ConectaRiesgoAI.Api.Tests.Features.Transparencia;

public class ContratosSecopHandlerTests
{
    [Fact]
    public async Task Handle_ClienteDevuelveContratos_LosMapeaAlDtoDeSalida()
    {
        var secopClient = new SecopClientFalso(
        [
            new ContratoSecop("Obras de contención de talud", 95_000_000m, 2023, "Alcaldía de Bogotá")
        ]);
        var handler = new ContratosSecopHandler(secopClient);

        var resultado = await handler.Handle(new ContratosSecopQuery("Bogotá"), CancellationToken.None);

        var contrato = Assert.Single(resultado);
        Assert.Equal("Obras de contención de talud", contrato.Objeto);
        Assert.Equal(95_000_000m, contrato.Valor);
        Assert.Equal(2023, contrato.Anio);
        Assert.Equal("Alcaldía de Bogotá", contrato.Entidad);
    }

    /// <summary>
    /// El cliente SECOP nunca lanza (garantía de <see cref="ISecopClient"/>): cuando la
    /// integración falla, lo que llega al handler es una lista vacía, no una excepción. El
    /// handler debe seguir respondiendo 200 con lista vacía, nunca romper la petición.
    /// </summary>
    [Fact]
    public async Task Handle_ClienteSinResultados_DevuelveListaVaciaSinRomper()
    {
        var handler = new ContratosSecopHandler(new SecopClientFalso());

        var resultado = await handler.Handle(new ContratosSecopQuery("Municipio sin datos"), CancellationToken.None);

        Assert.Empty(resultado);
    }
}
