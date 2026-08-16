using ConectaRiesgoAI.Api.Features.Reportes.ListarReportes;

namespace ConectaRiesgoAI.Api.Tests.Features.Reportes;

public class ListarReportesValidatorTests
{
    private readonly ListarReportesValidator _validador = new();

    [Fact]
    public void Validate_RadioKmNegativo_FallaEnElCampoRadioKm()
    {
        var query = new ListarReportesQuery(null, null, 4.71, -74.07, -5, null, null);

        var resultado = _validador.Validate(query);

        Assert.Contains(resultado.Errors, e => e.PropertyName == nameof(ListarReportesQuery.RadioKm));
    }

    [Fact]
    public void Validate_LimiteFueraDeRango_FallaEnElCampoLimite()
    {
        var query = new ListarReportesQuery(null, null, null, null, null, null, 501);

        var resultado = _validador.Validate(query);

        Assert.Contains(resultado.Errors, e => e.PropertyName == nameof(ListarReportesQuery.Limite));
    }

    [Fact]
    public void Validate_SinFiltros_NoTieneErrores()
    {
        var resultado = _validador.Validate(new ListarReportesQuery(null, null, null, null, null, null, null));

        Assert.True(resultado.IsValid);
    }
}
