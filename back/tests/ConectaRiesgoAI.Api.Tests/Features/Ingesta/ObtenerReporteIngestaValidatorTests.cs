using ConectaRiesgoAI.Api.Features.Ingesta.ObtenerReporte;

namespace ConectaRiesgoAI.Api.Tests.Features.Ingesta;

public class ObtenerReporteIngestaValidatorTests
{
    private static readonly ObtenerReporteIngestaValidator Validador = new();

    [Fact]
    public void Validate_CodigoConValor_Pasa()
    {
        var resultado = Validador.Validate(new ObtenerReporteIngestaQuery("RPT-2026-08-16-0001"));

        Assert.True(resultado.IsValid);
    }

    [Fact]
    public void Validate_CodigoVacio_Falla()
    {
        var resultado = Validador.Validate(new ObtenerReporteIngestaQuery(""));

        Assert.False(resultado.IsValid);
        Assert.Contains(resultado.Errors, e => e.PropertyName == nameof(ObtenerReporteIngestaQuery.Codigo));
    }
}
