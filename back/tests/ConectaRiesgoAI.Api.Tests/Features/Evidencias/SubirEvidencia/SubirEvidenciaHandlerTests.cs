using ConectaRiesgoAI.Api.Domain.Enums;
using ConectaRiesgoAI.Api.Features.Evidencias.SubirEvidencia;
using ConectaRiesgoAI.Api.Integrations.Storage;

namespace ConectaRiesgoAI.Api.Tests.Features.Evidencias.SubirEvidencia;

public class SubirEvidenciaHandlerTests
{
    /// <summary>Fake sin dependencias externas: no hay librería de mocking en este proyecto de tests.</summary>
    private class AlmacenamientoFalso(ResultadoSubida resultado) : IAlmacenamientoDeArchivos
    {
        public Contenedor? ContenedorRecibido { get; private set; }

        public Task<ResultadoSubida> SubirAsync(
            Contenedor contenedor, Stream contenido, string tipoContenido, CancellationToken cancellationToken)
        {
            ContenedorRecibido = contenedor;
            return Task.FromResult(resultado);
        }
    }

    private static SubirEvidenciaCommand Comando(TipoEvidencia tipo) =>
        new(tipo, "image/jpeg", 1024, Stream.Null);

    [Fact]
    public async Task Handle_SubidaExitosa_DevuelveLaUrlFirmada()
    {
        var almacenamiento = new AlmacenamientoFalso(new ResultadoSubida(true, "https://blob/evidencias/x.jpg?sig=abc", null));
        var handler = new SubirEvidenciaHandler(almacenamiento);

        var respuesta = await handler.Handle(Comando(TipoEvidencia.DanoMaterial), CancellationToken.None);

        Assert.True(respuesta.Subida);
        Assert.Equal("https://blob/evidencias/x.jpg?sig=abc", respuesta.UrlFoto);
    }

    [Fact]
    public async Task Handle_BlobNoDisponible_DevuelveSubidaFalsoSinLanzar()
    {
        var almacenamiento = new AlmacenamientoFalso(new ResultadoSubida(false, null, "timeout"));
        var handler = new SubirEvidenciaHandler(almacenamiento);

        var respuesta = await handler.Handle(Comando(TipoEvidencia.DanoMaterial), CancellationToken.None);

        Assert.False(respuesta.Subida);
        Assert.Null(respuesta.UrlFoto);
    }

    [Theory]
    [InlineData(TipoEvidencia.DanoMaterial, Contenedor.Evidencias)]
    [InlineData(TipoEvidencia.Otro, Contenedor.Evidencias)]
    [InlineData(TipoEvidencia.DocumentoFrontal, Contenedor.Censo)]
    [InlineData(TipoEvidencia.DocumentoPosterior, Contenedor.Censo)]
    [InlineData(TipoEvidencia.Rostro, Contenedor.Censo)]
    [InlineData(TipoEvidencia.NucleoFamiliar, Contenedor.Censo)]
    public async Task Handle_SegunElTipo_EligeElContenedorCorrecto(TipoEvidencia tipo, Contenedor esperado)
    {
        var almacenamiento = new AlmacenamientoFalso(new ResultadoSubida(true, "https://blob/x.jpg", null));
        var handler = new SubirEvidenciaHandler(almacenamiento);

        await handler.Handle(Comando(tipo), CancellationToken.None);

        Assert.Equal(esperado, almacenamiento.ContenedorRecibido);
    }
}
