using FluentValidation;

namespace ConectaRiesgoAI.Api.Features.Ingesta.ObtenerReporte;

/// <summary>
/// No es explotable —EF Core parametriza la consulta por <c>Codigo</c>— pero sin este validador
/// la consulta quedaba fuera del pipeline: rompía la garantía que justifica MediatR en este
/// proyecto ("el ValidationBehavior valida toda petición sin que haya que acordarse").
/// </summary>
public class ObtenerReporteIngestaValidator : AbstractValidator<ObtenerReporteIngestaQuery>
{
    public ObtenerReporteIngestaValidator()
    {
        RuleFor(q => q.Codigo).NotEmpty().WithMessage("El código del reporte es obligatorio");
    }
}
