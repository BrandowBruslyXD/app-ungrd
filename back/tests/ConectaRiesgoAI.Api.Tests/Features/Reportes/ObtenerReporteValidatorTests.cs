using ConectaRiesgoAI.Api.Features.Reportes.ObtenerReporte;

namespace ConectaRiesgoAI.Api.Tests.Features.Reportes;

public class ObtenerReporteValidatorTests
{
    private static readonly ObtenerReporteValidator Validador = new();

    [Fact]
    public void Validate_CodigoValido_Pasa()
    {
        FluentValidation.Results.ValidationResult resultado =
            Validador.Validate(new ObtenerReporteQuery("RPT-2026-08-16-0001"));

        Assert.True(resultado.IsValid);
    }

    [Fact]
    public void Validate_CodigoVacio_FallaConMensajeExplicito()
    {
        FluentValidation.Results.ValidationResult resultado =
            Validador.Validate(new ObtenerReporteQuery(""));

        Assert.False(resultado.IsValid);
        var error = Assert.Single(resultado.Errors, e => e.PropertyName == nameof(ObtenerReporteQuery.Codigo));
        Assert.Equal("El código del reporte es obligatorio", error.ErrorMessage);
    }
}
