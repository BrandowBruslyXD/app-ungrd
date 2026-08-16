using ConectaRiesgoAI.Api.Common.Auth;
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

    private class UsuarioActualFalso(Rol? rol) : IUsuarioActual
    {
        public int? Id => 1;
        public string? Nombre => "Prueba";
        public Rol? Rol { get; } = rol;
        public bool EstaAutenticado => true;
    }

    private static SubirEvidenciaCommand Comando(TipoEvidencia tipo) =>
        new(tipo, "image/jpeg", 1024, Stream.Null);

    private static SubirEvidenciaHandler Handler(
        ResultadoSubida? resultado = null, Rol? rol = null) =>
        new(
            new AlmacenamientoFalso(resultado ?? new ResultadoSubida(true, "https://blob/x.jpg", null)),
            new UsuarioActualFalso(rol));

    [Fact]
    public async Task Handle_SubidaExitosa_DevuelveLaUrlFirmada()
    {
        var handler = Handler(new ResultadoSubida(true, "https://blob/evidencias/x.jpg?sig=abc", null), Rol.Ciudadano);

        var respuesta = await handler.Handle(Comando(TipoEvidencia.DanoMaterial), CancellationToken.None);

        Assert.True(respuesta.Subida);
        Assert.Equal("https://blob/evidencias/x.jpg?sig=abc", respuesta.UrlFoto);
    }

    [Fact]
    public async Task Handle_BlobNoDisponible_DevuelveSubidaFalsoSinLanzar()
    {
        var handler = Handler(new ResultadoSubida(false, null, "timeout"), Rol.Ciudadano);

        var respuesta = await handler.Handle(Comando(TipoEvidencia.DanoMaterial), CancellationToken.None);

        Assert.False(respuesta.Subida);
        Assert.Null(respuesta.UrlFoto);
    }

    [Theory]
    [InlineData(TipoEvidencia.DanoMaterial, Contenedor.Evidencias)]
    [InlineData(TipoEvidencia.Otro, Contenedor.Evidencias)]
    public async Task Handle_TiposDeReporte_ElContenedorEsEvidenciasYCiudadanoPuedeSubir(
        TipoEvidencia tipo, Contenedor esperado)
    {
        var almacenamiento = new AlmacenamientoFalso(new ResultadoSubida(true, "https://blob/x.jpg", null));
        var handler = new SubirEvidenciaHandler(almacenamiento, new UsuarioActualFalso(Rol.Ciudadano));

        await handler.Handle(Comando(tipo), CancellationToken.None);

        Assert.Equal(esperado, almacenamiento.ContenedorRecibido);
    }

    [Theory]
    [InlineData(TipoEvidencia.DocumentoFrontal)]
    [InlineData(TipoEvidencia.DocumentoPosterior)]
    [InlineData(TipoEvidencia.Rostro)]
    [InlineData(TipoEvidencia.NucleoFamiliar)]
    public async Task Handle_TiposDeCenso_UnCiudadanoNoPuedeSubir(TipoEvidencia tipo)
    {
        var handler = Handler(rol: Rol.Ciudadano);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => handler.Handle(Comando(tipo), CancellationToken.None));
    }

    [Theory]
    [InlineData(TipoEvidencia.DocumentoFrontal)]
    [InlineData(TipoEvidencia.DocumentoPosterior)]
    [InlineData(TipoEvidencia.Rostro)]
    [InlineData(TipoEvidencia.NucleoFamiliar)]
    public async Task Handle_TiposDeCenso_UnGestorSiPuedeSubir(TipoEvidencia tipo)
    {
        var almacenamiento = new AlmacenamientoFalso(new ResultadoSubida(true, "https://blob/x.jpg", null));
        var handler = new SubirEvidenciaHandler(almacenamiento, new UsuarioActualFalso(Rol.Gestor));

        await handler.Handle(Comando(tipo), CancellationToken.None);

        Assert.Equal(Contenedor.Censo, almacenamiento.ContenedorRecibido);
    }

    [Fact]
    public async Task Handle_TipoDeCensoConAdmin_SiPuedeSubir()
    {
        var almacenamiento = new AlmacenamientoFalso(new ResultadoSubida(true, "https://blob/x.jpg", null));
        var handler = new SubirEvidenciaHandler(almacenamiento, new UsuarioActualFalso(Rol.Admin));

        await handler.Handle(Comando(TipoEvidencia.Rostro), CancellationToken.None);

        Assert.Equal(Contenedor.Censo, almacenamiento.ContenedorRecibido);
    }
}
