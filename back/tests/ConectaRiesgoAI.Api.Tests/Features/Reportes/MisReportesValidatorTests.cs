using ConectaRiesgoAI.Api.Features.Reportes.MisReportes;

namespace ConectaRiesgoAI.Api.Tests.Features.Reportes;

public class MisReportesValidatorTests
{
    private readonly MisReportesValidator _validador = new();

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Validate_UsuarioIdNoPositivo_FallaEnElCampoUsuarioId(int usuarioId)
    {
        var resultado = _validador.Validate(new MisReportesQuery(usuarioId));

        Assert.Contains(resultado.Errors, e => e.PropertyName == nameof(MisReportesQuery.UsuarioId));
    }

    [Fact]
    public void Validate_UsuarioIdPositivo_NoTieneErrores()
    {
        var resultado = _validador.Validate(new MisReportesQuery(1));

        Assert.True(resultado.IsValid);
    }
}
