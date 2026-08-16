using ConectaRiesgoAI.Api.Common.Auth;

namespace ConectaRiesgoAI.Api.Tests.Common.Auth;

public class AutenticacionApiKeyHandlerTests
{
    [Fact]
    public void EsClaveValida_ClaveCorrecta_DevuelveTrue()
    {
        Assert.True(AutenticacionApiKeyHandler.EsClaveValida("clave-secreta", "clave-secreta"));
    }

    [Fact]
    public void EsClaveValida_ClaveIncorrecta_DevuelveFalse()
    {
        Assert.False(AutenticacionApiKeyHandler.EsClaveValida("otra-clave", "clave-secreta"));
    }

    [Fact]
    public void EsClaveValida_ClaveDeLargoDistinto_DevuelveFalse()
    {
        Assert.False(AutenticacionApiKeyHandler.EsClaveValida("corta", "clave-secreta-larga"));
    }

    [Fact]
    public void EsClaveValida_SinCabecera_DevuelveFalse()
    {
        Assert.False(AutenticacionApiKeyHandler.EsClaveValida(null, "clave-secreta"));
    }

    [Fact]
    public void EsClaveValida_ClaveConfiguradaVacia_DevuelveFalse()
    {
        // Si nadie configuró IngestaBot:ApiKey en el entorno, el endpoint queda cerrado
        // en vez de aceptar una clave vacía como válida.
        Assert.False(AutenticacionApiKeyHandler.EsClaveValida("", ""));
    }
}
