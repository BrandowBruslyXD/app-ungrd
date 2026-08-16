using ConectaRiesgoAI.Api.Common.Configuracion;
using Microsoft.Extensions.Configuration;

namespace ConectaRiesgoAI.Api.Tests.Common;

/// <summary>
/// Comprueba cómo se resuelven los orígenes permitidos.
/// </summary>
/// <remarks>
/// Un error aquí no se ve en ningún registro: el navegador bloquea las llamadas y
/// la pantalla queda vacía. Por eso se prueba cada caso, incluidos los que un
/// despliegue apurado produce —una coma de más, un espacio, una barra final—.
/// </remarks>
public class OrigenesCorsTests
{
    private static IConfiguration Configuracion(Dictionary<string, string?> valores) =>
        new ConfigurationBuilder().AddInMemoryCollection(valores).Build();

    [Fact]
    public void Resolver_SinNadaConfigurado_DevuelveElVitePorDefecto()
    {
        IConfiguration configuracion = Configuracion([]);

        var resultado = OrigenesCors.Resolver(configuracion);

        Assert.Equal(["http://localhost:5173"], resultado);
    }

    [Fact]
    public void Resolver_ConArregloEnElArchivo_DevuelveEseArreglo()
    {
        IConfiguration configuracion = Configuracion(new()
        {
            ["Cors:Origenes:0"] = "http://localhost:5173",
            ["Cors:Origenes:1"] = "http://localhost:5199",
        });

        var resultado = OrigenesCors.Resolver(configuracion);

        Assert.Equal(["http://localhost:5173", "http://localhost:5199"], resultado);
    }

    [Fact]
    public void Resolver_ConVariable_ReemplazaElArregloEnVezDeCombinarse()
    {
        // Es la razón de ser de esta clase: con Cors__Origenes__N, .NET combina por
        // índice y produccion se quedaba permitiendo los localhost del archivo.
        IConfiguration configuracion = Configuracion(new()
        {
            ["Cors:Origenes:0"] = "http://localhost:5173",
            ["Cors:Origenes:1"] = "http://localhost:5199",
            ["CORS_ORIGENES"] = "https://conectariesgoai.vercel.app",
        });

        var resultado = OrigenesCors.Resolver(configuracion);

        Assert.Equal(["https://conectariesgoai.vercel.app"], resultado);
        Assert.DoesNotContain(resultado, o => o.Contains("localhost", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void Resolver_ConVariosSeparadosPorComa_LosDevuelveTodos()
    {
        IConfiguration configuracion = Configuracion(new()
        {
            ["CORS_ORIGENES"] = "https://conectariesgoai.vercel.app,https://conectariesgo.gov.co",
        });

        var resultado = OrigenesCors.Resolver(configuracion);

        Assert.Equal(
            ["https://conectariesgoai.vercel.app", "https://conectariesgo.gov.co"],
            resultado);
    }

    [Fact]
    public void Resolver_ConEspaciosYComasDeMas_LosIgnora()
    {
        IConfiguration configuracion = Configuracion(new()
        {
            ["CORS_ORIGENES"] = " https://uno.app , , https://dos.app ,",
        });

        var resultado = OrigenesCors.Resolver(configuracion);

        Assert.Equal(["https://uno.app", "https://dos.app"], resultado);
    }

    [Fact]
    public void Resolver_ConBarraFinal_LaQuita()
    {
        // El navegador manda `Origin` sin barra final. Con ella configurada nunca
        // coincide, y el sintoma es identico a no haberla configurado.
        IConfiguration configuracion = Configuracion(new()
        {
            ["CORS_ORIGENES"] = "https://conectariesgoai.vercel.app/",
        });

        var resultado = OrigenesCors.Resolver(configuracion);

        Assert.Equal(["https://conectariesgoai.vercel.app"], resultado);
    }

    [Fact]
    public void Resolver_ConOrigenesRepetidos_LosDejaUnaSolaVez()
    {
        IConfiguration configuracion = Configuracion(new()
        {
            ["CORS_ORIGENES"] = "https://uno.app,https://uno.app/,https://UNO.app",
        });

        var resultado = OrigenesCors.Resolver(configuracion);

        Assert.Single(resultado);
    }

    [Fact]
    public void Resolver_ConVariableVacia_CaeAlArchivoEnVezDeQuedarseSinNinguno()
    {
        // Una variable declarada pero sin valor es un despiste habitual en un panel
        // de despliegue. Si eso dejara la lista vacia, se bloquearia todo el trafico.
        IConfiguration configuracion = Configuracion(new()
        {
            ["Cors:Origenes:0"] = "https://conectariesgoai.vercel.app",
            ["CORS_ORIGENES"] = "   ",
        });

        var resultado = OrigenesCors.Resolver(configuracion);

        Assert.Equal(["https://conectariesgoai.vercel.app"], resultado);
    }
}
