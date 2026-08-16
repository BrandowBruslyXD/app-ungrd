using ConectaRiesgoAI.Api.Integrations.Storage;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace ConectaRiesgoAI.Api.Tests.Integrations.Storage;

public class AlmacenamientoDeArchivosAzureTests
{
    private static AlmacenamientoDeArchivosAzure Crear(string? connectionString)
    {
        Dictionary<string, string?> configuracion = connectionString is null
            ? []
            : new Dictionary<string, string?> { ["ConnectionStrings:AzureStorage"] = connectionString };

        IConfiguration config = new ConfigurationBuilder().AddInMemoryCollection(configuracion).Build();

        return new AlmacenamientoDeArchivosAzure(
            config,
            Options.Create(new OpcionesAlmacenamiento()),
            NullLogger<AlmacenamientoDeArchivosAzure>.Instance);
    }

    [Fact]
    public void Constructor_SinConnectionString_NoLanzaExcepcion()
    {
        // La configuración vacía (issue #47 aún sin aprovisionar) no puede tumbar el servicio
        // al arrancar ni al primer request: ver CLAUDE.md, "si una falla, oculta ese bloque".
        var excepcion = Record.Exception(() => Crear(connectionString: null));

        Assert.Null(excepcion);
    }

    [Fact]
    public async Task SubirAsync_SinConnectionString_DevuelveExitosoFalsoSinLanzar()
    {
        var almacenamiento = Crear(connectionString: null);

        var resultado = await almacenamiento.SubirAsync(
            Contenedor.Evidencias, Stream.Null, "image/jpeg", CancellationToken.None);

        Assert.False(resultado.Exitoso);
        Assert.Null(resultado.UrlFirmada);
    }

    [Fact]
    public async Task SubirAsync_ConnectionStringInvalida_DevuelveExitosoFalsoSinLanzar()
    {
        var almacenamiento = Crear(connectionString: "esto-no-es-una-cadena-de-conexion-valida");

        var resultado = await almacenamiento.SubirAsync(
            Contenedor.Evidencias, Stream.Null, "image/jpeg", CancellationToken.None);

        Assert.False(resultado.Exitoso);
        Assert.Null(resultado.UrlFirmada);
    }
}
