using System.Runtime.CompilerServices;
using System.Text.Json;

namespace ConectaRiesgoAI.Api.Tests.Configuracion;

// ASP.NET Core sí tolera comentarios `//`/`/* */` en appsettings*.json (JsonConfigurationProvider
// usa JsonCommentHandling.Skip): un comentario aquí NO rompe `dotnet run`, verificado en vivo.
// Este archivo se mantiene como JSON estricto de todos modos, porque otras herramientas que sí
// lo tocan (jq, editores, linters de JSON genéricos, un futuro script de CI) no son tan permisivas.
public class AppsettingsEjemploTests
{
    private static string RutaAppsettingsDevelopmentExample([CallerFilePath] string rutaDeEsteArchivo = "") =>
        Path.GetFullPath(Path.Combine(
            Path.GetDirectoryName(rutaDeEsteArchivo)!,
            "..", "..", "..", "src", "ConectaRiesgoAI.Api", "appsettings.Development.example.json"));

    [Fact]
    public void AppsettingsDevelopmentExample_EsJsonEstrictamenteValido()
    {
        var contenido = File.ReadAllText(RutaAppsettingsDevelopmentExample());

        var excepcion = Record.Exception(() => JsonDocument.Parse(contenido));

        Assert.Null(excepcion);
    }

    [Fact]
    public void AppsettingsDevelopmentExample_TraeLasClavesQueNecesitaElBackendParaArrancar()
    {
        using var documento = JsonDocument.Parse(File.ReadAllText(RutaAppsettingsDevelopmentExample()));
        var raiz = documento.RootElement;

        var cadenaPostgres = raiz.GetProperty("ConnectionStrings").GetProperty("Postgres").GetString();
        Assert.False(string.IsNullOrWhiteSpace(cadenaPostgres));

        var secretoJwt = raiz.GetProperty("Jwt").GetProperty("Secret").GetString();
        Assert.False(string.IsNullOrWhiteSpace(secretoJwt));
    }
}
