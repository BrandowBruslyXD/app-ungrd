using ConectaRiesgoAI.Api.Common.Behaviors;
using FluentValidation;
using MediatR;

namespace ConectaRiesgoAI.Api.Tests.Common.Behaviors;

public class ValidationBehaviorTests
{
    private sealed record PeticionDePrueba(string Valor) : IRequest<string>;

    private sealed class ValidadorDePrueba : AbstractValidator<PeticionDePrueba>
    {
        public ValidadorDePrueba() => RuleFor(p => p.Valor).NotEmpty();
    }

    [Fact]
    public async Task Handle_SinValidadores_EjecutaElSiguienteDelegado()
    {
        ValidationBehavior<PeticionDePrueba, string> behavior =
            new([]);

        string resultado = await behavior.Handle(
            new PeticionDePrueba("ok"),
            _ => Task.FromResult("ejecutado"),
            CancellationToken.None);

        Assert.Equal("ejecutado", resultado);
    }

    [Fact]
    public async Task Handle_ValidacionExitosa_EjecutaElSiguienteDelegado()
    {
        ValidationBehavior<PeticionDePrueba, string> behavior =
            new([new ValidadorDePrueba()]);

        string resultado = await behavior.Handle(
            new PeticionDePrueba("valor"),
            _ => Task.FromResult("ejecutado"),
            CancellationToken.None);

        Assert.Equal("ejecutado", resultado);
    }

    [Fact]
    public async Task Handle_ValidacionFallida_LanzaValidationException()
    {
        ValidationBehavior<PeticionDePrueba, string> behavior =
            new([new ValidadorDePrueba()]);

        await Assert.ThrowsAsync<ValidationException>(() => behavior.Handle(
            new PeticionDePrueba(""),
            _ => Task.FromResult("no-deberia-llegar"),
            CancellationToken.None));
    }
}
