using ConectaRiesgoAI.Api.Features.Auth.Login;

namespace ConectaRiesgoAI.Api.Tests.Features.Auth;

public class LoginValidatorTests
{
    private static readonly LoginValidator Validador = new();

    [Fact]
    public void Validate_PasswordNull_NoLanzaExcepcionYFallaValidacion()
    {
        var comando = new LoginCommand("maria@ejemplo.com", null!);

        var resultado = Validador.Validate(comando);

        Assert.False(resultado.IsValid);
        Assert.Contains(resultado.Errors, e => e.PropertyName == nameof(LoginCommand.Password));
    }
}
