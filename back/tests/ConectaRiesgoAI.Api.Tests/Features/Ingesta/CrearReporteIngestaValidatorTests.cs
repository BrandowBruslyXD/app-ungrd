using ConectaRiesgoAI.Api.Domain.Enums;
using ConectaRiesgoAI.Api.Features.Ingesta.CrearReporte;

namespace ConectaRiesgoAI.Api.Tests.Features.Ingesta;

public class CrearReporteIngestaValidatorTests
{
    private static readonly CrearReporteIngestaValidator Validador = new();

    private static CrearReporteIngestaCommand Comando(string clase = "afectacion_propia", string telefono = "573001234567") =>
        new(telefono, "María R.", clase, TipoReporte.Inundacion, "Se inundó la casa", "Soacha, Villa Mercedes", "Averiada", "AHE alimentaria", null);

    [Fact]
    public void Validate_ComandoValido_Pasa()
    {
        var resultado = Validador.Validate(Comando());

        Assert.True(resultado.IsValid);
    }

    [Fact]
    public void Validate_TelefonoVacio_Falla()
    {
        var resultado = Validador.Validate(Comando(telefono: ""));

        Assert.False(resultado.IsValid);
        Assert.Contains(resultado.Errors, e => e.PropertyName == nameof(CrearReporteIngestaCommand.Telefono));
    }

    [Fact]
    public void Validate_TelefonoConCaracteresEspeciales_Falla()
    {
        var resultado = Validador.Validate(Comando(telefono: "573@001"));

        Assert.False(resultado.IsValid);
        var error = Assert.Single(resultado.Errors, e => e.PropertyName == nameof(CrearReporteIngestaCommand.Telefono));
        Assert.Equal("El teléfono debe contener solo dígitos (mínimo 7)", error.ErrorMessage);
    }

    [Fact]
    public void Validate_TelefonoCorto_Falla()
    {
        var resultado = Validador.Validate(Comando(telefono: "57300"));

        Assert.False(resultado.IsValid);
        Assert.Contains(resultado.Errors, e => e.PropertyName == nameof(CrearReporteIngestaCommand.Telefono));
    }

    [Fact]
    public void Validate_ClaseDesconocida_Falla()
    {
        var resultado = Validador.Validate(Comando(clase: "algo_raro"));

        Assert.False(resultado.IsValid);
        Assert.Contains(resultado.Errors, e => e.PropertyName == nameof(CrearReporteIngestaCommand.Clase));
    }

    [Fact]
    public void Validate_ClaseAvisoEvento_Pasa()
    {
        var resultado = Validador.Validate(Comando(clase: "aviso_evento"));

        Assert.True(resultado.IsValid);
    }

    [Fact]
    public void Validate_DescripcionVacia_Falla()
    {
        var comando = Comando() with { Descripcion = "" };

        var resultado = Validador.Validate(comando);

        Assert.False(resultado.IsValid);
        Assert.Contains(resultado.Errors, e => e.PropertyName == nameof(CrearReporteIngestaCommand.Descripcion));
    }
}
