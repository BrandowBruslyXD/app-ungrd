using ConectaRiesgoAI.Api.Features.Verificacion.VerificacionSatelital;

namespace ConectaRiesgoAI.Api.Tests.Features.Verificacion;

public class VerificacionSatelitalValidatorTests
{
    private readonly VerificacionSatelitalValidator _validador = new();

    [Theory]
    [InlineData(-91, -74.07, 5)]
    [InlineData(91, -74.07, 5)]
    public void Validate_LatitudFueraDeRango_FallaValidacion(double lat, double lng, double radioKm)
    {
        var resultado = _validador.Validate(new VerificacionSatelitalQuery(lat, lng, radioKm));

        Assert.False(resultado.IsValid);
    }

    [Theory]
    [InlineData(4.71, -181, 5)]
    [InlineData(4.71, 181, 5)]
    public void Validate_LongitudFueraDeRango_FallaValidacion(double lat, double lng, double radioKm)
    {
        var resultado = _validador.Validate(new VerificacionSatelitalQuery(lat, lng, radioKm));

        Assert.False(resultado.IsValid);
    }

    [Fact]
    public void Validate_RadioKmCero_FallaValidacion()
    {
        var resultado = _validador.Validate(new VerificacionSatelitalQuery(4.71, -74.07, 0));

        Assert.False(resultado.IsValid);
    }

    [Fact]
    public void Validate_RadioKmMayorA200_FallaValidacion()
    {
        var resultado = _validador.Validate(new VerificacionSatelitalQuery(4.71, -74.07, 201));

        Assert.False(resultado.IsValid);
    }

    [Fact]
    public void Validate_ParametrosValidos_PasaValidacion()
    {
        var resultado = _validador.Validate(new VerificacionSatelitalQuery(4.71, -74.07, 5));

        Assert.True(resultado.IsValid);
    }
}
