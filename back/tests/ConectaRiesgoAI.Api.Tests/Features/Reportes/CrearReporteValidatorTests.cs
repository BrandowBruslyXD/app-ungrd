using ConectaRiesgoAI.Api.Domain.Enums;
using ConectaRiesgoAI.Api.Features.Reportes.CrearReporte;

namespace ConectaRiesgoAI.Api.Tests.Features.Reportes;

public class CrearReporteValidatorTests
{
    private readonly CrearReporteValidator _validador = new();

    private static CrearReporteCommand ComandoValido() => new(
        TipoReporte.Inundacion, "Se está inundando la vía principal", 4.71, -74.07, null, "Bogotá", null);

    [Fact]
    public void Validate_DescripcionVacia_FallaEnElCampoDescripcion()
    {
        var comando = ComandoValido() with { Descripcion = "" };

        var resultado = _validador.Validate(comando);

        Assert.False(resultado.IsValid);
        Assert.Contains(resultado.Errors, e => e.PropertyName == nameof(CrearReporteCommand.Descripcion));
    }

    [Theory]
    [InlineData(91)]
    [InlineData(-91)]
    public void Validate_LatitudFueraDeRango_FallaEnElCampoLatitud(double latitud)
    {
        var comando = ComandoValido() with { Latitud = latitud };

        var resultado = _validador.Validate(comando);

        Assert.Contains(resultado.Errors, e => e.PropertyName == nameof(CrearReporteCommand.Latitud));
    }

    [Fact]
    public void Validate_MunicipioVacio_FallaEnElCampoMunicipio()
    {
        var comando = ComandoValido() with { Municipio = "" };

        var resultado = _validador.Validate(comando);

        Assert.Contains(resultado.Errors, e => e.PropertyName == nameof(CrearReporteCommand.Municipio));
    }

    [Fact]
    public void Validate_ComandoValido_NoTieneErrores()
    {
        var resultado = _validador.Validate(ComandoValido());

        Assert.True(resultado.IsValid);
    }
}
