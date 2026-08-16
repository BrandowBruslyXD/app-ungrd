using ConectaRiesgoAI.Api.Common.Auth;
using Microsoft.Extensions.Primitives;

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

    [Fact]
    public void TryExtraerClaveRecibida_UnValorValido_ExtraeLaClave()
    {
        bool ok = AutenticacionApiKeyHandler.TryExtraerClaveRecibida(
            new StringValues("clave-secreta"), out string? clave, out string? error);

        Assert.True(ok);
        Assert.Equal("clave-secreta", clave);
        Assert.Null(error);
    }

    [Fact]
    public void TryExtraerClaveRecibida_MultiplesValores_Falla()
    {
        bool ok = AutenticacionApiKeyHandler.TryExtraerClaveRecibida(
            new StringValues(["abc", "def"]), out string? clave, out string? error);

        Assert.False(ok);
        Assert.Null(clave);
        Assert.Equal("Cabecera malformada", error);
    }

    [Fact]
    public void TryExtraerClaveRecibida_ValorVacio_Falla()
    {
        bool ok = AutenticacionApiKeyHandler.TryExtraerClaveRecibida(
            new StringValues(""), out string? clave, out string? error);

        Assert.False(ok);
        Assert.True(string.IsNullOrEmpty(clave));
        Assert.Equal("Clave de servicio vacía o malformada", error);
    }
}
