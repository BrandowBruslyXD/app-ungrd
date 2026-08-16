using System.Text;
using ConectaRiesgoAI.Api.Domain.Enums;
using ConectaRiesgoAI.Api.Features.Evidencias.SubirEvidencia;

namespace ConectaRiesgoAI.Api.Tests.Features.Evidencias.SubirEvidencia;

public class SubirEvidenciaValidatorTests
{
    private readonly SubirEvidenciaValidator _validator = new();

    private static Stream StreamValidoPara(string tipoContenido) => tipoContenido switch
    {
        "image/jpeg" => new MemoryStream([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x00]),
        "image/png" => new MemoryStream([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
        "image/webp" => new MemoryStream(
            [(byte)'R', (byte)'I', (byte)'F', (byte)'F', 0, 0, 0, 0, (byte)'W', (byte)'E', (byte)'B', (byte)'P']),
        _ => new MemoryStream([0x00, 0x00, 0x00, 0x00])
    };

    private static SubirEvidenciaCommand Comando(
        long tamanoBytes = 1024, string tipoContenido = "image/jpeg", Stream? contenido = null) =>
        new(TipoEvidencia.DanoMaterial, tipoContenido, tamanoBytes, contenido ?? StreamValidoPara(tipoContenido));

    [Fact]
    public async Task Validate_ArchivoDentroDelLimite_NoProduceErrores()
    {
        var resultado = await _validator.ValidateAsync(Comando(tamanoBytes: 5 * 1024 * 1024));

        Assert.True(resultado.IsValid);
    }

    [Fact]
    public async Task Validate_ArchivoMasGrandeDeCincoMegas_RechazaConError()
    {
        var resultado = await _validator.ValidateAsync(Comando(tamanoBytes: 5 * 1024 * 1024 + 1));

        Assert.False(resultado.IsValid);
        Assert.Contains(resultado.Errors, e => e.PropertyName == nameof(SubirEvidenciaCommand.TamanoBytes));
    }

    [Theory]
    [InlineData("application/pdf")]
    [InlineData("text/plain")]
    [InlineData("image/gif")]
    public async Task Validate_TipoDeContenidoNoPermitido_RechazaConError(string tipoContenido)
    {
        var resultado = await _validator.ValidateAsync(Comando(tipoContenido: tipoContenido, contenido: Stream.Null));

        Assert.False(resultado.IsValid);
        Assert.Contains(resultado.Errors, e => e.PropertyName == nameof(SubirEvidenciaCommand.TipoContenido));
    }

    [Theory]
    [InlineData("image/jpeg")]
    [InlineData("image/png")]
    [InlineData("image/webp")]
    public async Task Validate_TipoDeContenidoPermitidoYBytesCoinciden_NoProduceErrores(string tipoContenido)
    {
        var resultado = await _validator.ValidateAsync(Comando(tipoContenido: tipoContenido));

        Assert.True(resultado.IsValid);
    }

    [Fact]
    public async Task Validate_ContentTypeNoCoincideConLosBytesReales_RechazaConError()
    {
        // Un PDF disfrazado de imagen: el header dice "image/jpeg" pero los bytes son de otro tipo.
        var streamFalso = new MemoryStream(Encoding.ASCII.GetBytes("%PDF-1.4"));

        var resultado = await _validator.ValidateAsync(Comando(tipoContenido: "image/jpeg", contenido: streamFalso));

        Assert.False(resultado.IsValid);
        Assert.Contains(resultado.Errors, e => e.PropertyName == nameof(SubirEvidenciaCommand.Contenido));
    }

    [Fact]
    public async Task Validate_StreamNoBuscable_RechazaConError()
    {
        var streamNoBuscable = new StreamNoBuscable(StreamValidoPara("image/jpeg"));

        var resultado = await _validator.ValidateAsync(Comando(contenido: streamNoBuscable));

        Assert.False(resultado.IsValid);
        Assert.Contains(resultado.Errors, e => e.PropertyName == nameof(SubirEvidenciaCommand.Contenido));
    }

    /// <summary>Envuelve un stream real pero reporta <c>CanSeek = false</c>, para simular el peor caso.</summary>
    private class StreamNoBuscable(Stream interno) : Stream
    {
        public override bool CanRead => interno.CanRead;
        public override bool CanSeek => false;
        public override bool CanWrite => false;
        public override long Length => interno.Length;
        public override long Position { get => interno.Position; set => throw new NotSupportedException(); }
        public override void Flush() => interno.Flush();
        public override int Read(byte[] buffer, int offset, int count) => interno.Read(buffer, offset, count);
        public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();
        public override void SetLength(long value) => throw new NotSupportedException();
        public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();
    }
}
