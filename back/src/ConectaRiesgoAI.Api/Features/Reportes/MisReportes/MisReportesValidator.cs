using FluentValidation;

namespace ConectaRiesgoAI.Api.Features.Reportes.MisReportes;

/// <summary>
/// <c>UsuarioId</c> lo completa el endpoint desde el token, nunca el cliente, pero sin este
/// validador la consulta quedaba fuera del pipeline de <c>ValidationBehavior</c> — la misma
/// garantía que ya tienen el resto de las entradas de esta rebanada.
/// </summary>
public class MisReportesValidator : AbstractValidator<MisReportesQuery>
{
    public MisReportesValidator()
    {
        RuleFor(x => x.UsuarioId).GreaterThan(0).WithMessage("El identificador de usuario no es válido");
    }
}
