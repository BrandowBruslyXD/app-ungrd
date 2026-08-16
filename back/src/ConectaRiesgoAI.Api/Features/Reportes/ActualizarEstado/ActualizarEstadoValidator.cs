using FluentValidation;

namespace ConectaRiesgoAI.Api.Features.Reportes.ActualizarEstado;

/// <summary>Reglas de entrada: forma de los campos, no si la transición de estado tiene sentido (eso lo decide la entidad).</summary>
public class ActualizarEstadoValidator : AbstractValidator<ActualizarEstadoCommand>
{
    public ActualizarEstadoValidator()
    {
        RuleFor(c => c.Codigo)
            .NotEmpty().WithMessage("El código del reporte es obligatorio");
        RuleFor(c => c.Estado).Cascade(CascadeMode.Stop)
            .NotNull().WithMessage("El estado es obligatorio")
            .IsInEnum().WithMessage("El estado no es válido");
        RuleFor(c => c.Nota)
            .NotEmpty().WithMessage("La nota es obligatoria")
            .MaximumLength(500).WithMessage("La nota no puede superar los 500 caracteres");
    }
}
