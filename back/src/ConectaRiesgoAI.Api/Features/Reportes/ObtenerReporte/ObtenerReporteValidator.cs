using FluentValidation;

namespace ConectaRiesgoAI.Api.Features.Reportes.ObtenerReporte;

/// <summary>
/// No es explotable —EF Core parametriza la consulta por <c>Codigo</c>— pero sin este validador
/// la consulta quedaba fuera del pipeline: rompía la garantía que justifica MediatR en este
/// proyecto ("el ValidationBehavior valida toda petición sin que haya que acordarse").
/// </summary>
public class ObtenerReporteValidator : AbstractValidator<ObtenerReporteQuery>
{
    public ObtenerReporteValidator()
    {
        RuleFor(q => q.Codigo).NotEmpty().WithMessage("El código del reporte es obligatorio");
    }
}
