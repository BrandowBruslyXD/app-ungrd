using ConectaRiesgoAI.Api.Features.Auth.Registro;

namespace ConectaRiesgoAI.Api.Tests.Features.Auth;

public class RegistroValidatorTests
{
    private static readonly RegistroValidator Validador = new();

    [Fact]
    public void Validate_Password72CaracteresNoAscii_FallaPorqueSuperaLos72BytesUtf8()
    {
        // "ñ" ocupa 2 bytes en UTF-8: 72 "ñ" son 72 caracteres pero 144 bytes. Un chequeo que
        // contara caracteres (MaximumLength) dejaría pasar esto; el que cuenta bytes, no.
        var comando = new RegistroCommand("María", "maria@ejemplo.com", new string('ñ', 72), "Bogotá");

        var resultado = Validador.Validate(comando);

        Assert.False(resultado.IsValid);
        Assert.Contains(resultado.Errors, e => e.PropertyName == nameof(RegistroCommand.Password));
    }

    [Fact]
    public void Validate_Password72BytesUtf8Exactos_Pasa()
    {
        var comando = new RegistroCommand("María", "maria@ejemplo.com", new string('a', 72), "Bogotá");

        var resultado = Validador.Validate(comando);

        Assert.True(resultado.IsValid);
    }

    [Fact]
    public void Validate_PasswordNull_NoLanzaExcepcionYFallaValidacion()
    {
        var comando = new RegistroCommand("María", "maria@ejemplo.com", null!, "Bogotá");

        var resultado = Validador.Validate(comando);

        Assert.False(resultado.IsValid);
        Assert.Contains(resultado.Errors, e => e.PropertyName == nameof(RegistroCommand.Password));
    }
}
