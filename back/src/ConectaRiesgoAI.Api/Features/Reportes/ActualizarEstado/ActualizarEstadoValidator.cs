using FluentValidation;

namespace ConectaRiesgoAI.Api.Features.Reportes.ActualizarEstado;

/// <summary>Reglas de entrada: forma de los campos, no si la transición de estado tiene sentido (eso lo decide la entidad).</summary>
public class ActualizarEstadoValidator : AbstractValidator<ActualizarEstadoCommand>
{
    public ActualizarEstadoValidator()
    {
        RuleFor(c => c.Codigo).NotEmpty();
        RuleFor(c => c.Estado).IsInEnum();
        RuleFor(c => c.Nota).NotEmpty().MaximumLength(500);
    }
}
