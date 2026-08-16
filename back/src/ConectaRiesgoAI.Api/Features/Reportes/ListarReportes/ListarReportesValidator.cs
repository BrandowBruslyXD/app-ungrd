using FluentValidation;

namespace ConectaRiesgoAI.Api.Features.Reportes.ListarReportes;

public class ListarReportesValidator : AbstractValidator<ListarReportesQuery>
{
    public ListarReportesValidator()
    {
        RuleFor(x => x.Limite)
            .InclusiveBetween(1, 500).WithMessage("El límite debe estar entre 1 y 500")
            .When(x => x.Limite is not null);
        RuleFor(x => x.RadioKm)
            .GreaterThan(0).WithMessage("El radio en kilómetros debe ser mayor que 0")
            .When(x => x.RadioKm is not null);
        RuleFor(x => x.Lat)
            .InclusiveBetween(-90, 90).WithMessage("La latitud debe estar entre -90 y 90")
            .When(x => x.Lat is not null);
        RuleFor(x => x.Lng)
            .InclusiveBetween(-180, 180).WithMessage("La longitud debe estar entre -180 y 180")
            .When(x => x.Lng is not null);
    }
}
