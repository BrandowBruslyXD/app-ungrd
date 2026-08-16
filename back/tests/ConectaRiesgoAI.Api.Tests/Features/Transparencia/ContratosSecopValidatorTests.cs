using ConectaRiesgoAI.Api.Features.Transparencia.ContratosSecop;

namespace ConectaRiesgoAI.Api.Tests.Features.Transparencia;

public class ContratosSecopValidatorTests
{
    private readonly ContratosSecopValidator _validador = new();

    [Fact]
    public void Validate_MunicipioVacio_FallaValidacion()
    {
        var resultado = _validador.Validate(new ContratosSecopQuery(""));

        Assert.False(resultado.IsValid);
    }

    [Fact]
    public void Validate_MunicipioMasDe120Caracteres_FallaValidacion()
    {
        var resultado = _validador.Validate(new ContratosSecopQuery(new string('a', 121)));

        Assert.False(resultado.IsValid);
    }

    [Fact]
    public void Validate_MunicipioPresente_PasaValidacion()
    {
        var resultado = _validador.Validate(new ContratosSecopQuery("Bogotá"));

        Assert.True(resultado.IsValid);
    }
}
