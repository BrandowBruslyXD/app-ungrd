using System.Runtime.CompilerServices;
using System.Text.Json;

namespace ConectaRiesgoAI.Api.Tests.Configuracion;

public class AppsettingsEjemploTests
{
    private static string RutaAppsettingsDevelopmentExample([CallerFilePath] string rutaDeEsteArchivo = "") =>
        Path.GetFullPath(Path.Combine(
            Path.GetDirectoryName(rutaDeEsteArchivo)!,
            "..", "..", "..", "src", "ConectaRiesgoAI.Api", "appsettings.Development.example.json"));

    [Fact]
    public void AppsettingsDevelopmentExample_EsJsonValido()
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
