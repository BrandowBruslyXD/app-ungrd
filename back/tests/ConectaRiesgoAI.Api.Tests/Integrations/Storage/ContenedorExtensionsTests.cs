using ConectaRiesgoAI.Api.Integrations.Storage;

namespace ConectaRiesgoAI.Api.Tests.Integrations.Storage;

public class ContenedorExtensionsTests
{
    [Theory]
    [InlineData(Contenedor.Evidencias, "evidencias")]
    [InlineData(Contenedor.Censo, "censo")]
    public void ANombre_ContenedoresConocidos_DevuelveElNombreEnAzure(Contenedor contenedor, string esperado)
    {
        Assert.Equal(esperado, contenedor.ANombre());
    }

    [Fact]
    public void ANombre_ValorInvalido_LanzaArgumentOutOfRangeException()
    {
        Contenedor invalido = (Contenedor)999;

        Assert.Throws<ArgumentOutOfRangeException>(() => invalido.ANombre());
    }
}
