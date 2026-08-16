using ConectaRiesgoAI.Api.Domain.Enums;
using ConectaRiesgoAI.Api.Features.Evidencias.SubirEvidencia;

namespace ConectaRiesgoAI.Api.Tests.Features.Evidencias.SubirEvidencia;

public class SubirEvidenciaValidatorTests
{
    private readonly SubirEvidenciaValidator _validator = new();

    private static SubirEvidenciaCommand Comando(long tamanoBytes = 1024, string tipoContenido = "image/jpeg") =>
        new(TipoEvidencia.DanoMaterial, tipoContenido, tamanoBytes, Stream.Null);

    [Fact]
    public void Validate_ArchivoDentroDelLimite_NoProduceErrores()
    {
        var resultado = _validator.Validate(Comando(tamanoBytes: 5 * 1024 * 1024));

        Assert.True(resultado.IsValid);
    }

    [Fact]
    public void Validate_ArchivoMasGrandeDeCincoMegas_RechazaConError()
    {
        var resultado = _validator.Validate(Comando(tamanoBytes: 5 * 1024 * 1024 + 1));

        Assert.False(resultado.IsValid);
        Assert.Contains(resultado.Errors, e => e.PropertyName == nameof(SubirEvidenciaCommand.TamanoBytes));
    }

    [Theory]
    [InlineData("application/pdf")]
    [InlineData("text/plain")]
    [InlineData("image/gif")]
    public void Validate_TipoDeContenidoNoPermitido_RechazaConError(string tipoContenido)
    {
        var resultado = _validator.Validate(Comando(tipoContenido: tipoContenido));

        Assert.False(resultado.IsValid);
        Assert.Contains(resultado.Errors, e => e.PropertyName == nameof(SubirEvidenciaCommand.TipoContenido));
    }

    [Theory]
    [InlineData("image/jpeg")]
    [InlineData("image/png")]
    [InlineData("image/webp")]
    public void Validate_TipoDeContenidoPermitido_NoProduceErrores(string tipoContenido)
    {
        var resultado = _validator.Validate(Comando(tipoContenido: tipoContenido));

        Assert.True(resultado.IsValid);
    }
}
