using ConectaRiesgoAI.Api.Features.Estadisticas.ResumenEstadisticas;

namespace ConectaRiesgoAI.Api.Tests.Features.Estadisticas;

public class ResumenEstadisticasValidatorTests
{
    private readonly ResumenEstadisticasValidator _validador = new();

    [Fact]
    public void ResumenEstadisticasValidator_ConSoloRadioKmSinLatNiLng_FallaValidacion()
    {
        var query = new ResumenEstadisticasQuery(null, null, null, 10);

        var resultado = _validador.Validate(query);

        Assert.False(resultado.IsValid);
        Assert.Contains(resultado.Errors, error => error.PropertyName == "radioKm");
    }

    [Fact]
    public void ResumenEstadisticasValidator_ConLatLngYRadioKmValidos_PasaValidacion()
    {
        var query = new ResumenEstadisticasQuery(null, 4.710989, -74.072092, 10);

        var resultado = _validador.Validate(query);

        Assert.True(resultado.IsValid);
    }
}
