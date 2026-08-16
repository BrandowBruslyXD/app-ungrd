using FluentValidation;

namespace ConectaRiesgoAI.Api.Features.Transparencia.ContratosSecop;

/// <summary>Valida los parámetros de <c>GET /api/transparencia/secop</c>.</summary>
public class ContratosSecopValidator : AbstractValidator<ContratosSecopQuery>
{
    public ContratosSecopValidator()
    {
        RuleFor(x => x.Municipio)
            .NotEmpty().WithMessage("El municipio es obligatorio")
            .MaximumLength(120).WithMessage("El municipio no puede superar los 120 caracteres");
    }
}
