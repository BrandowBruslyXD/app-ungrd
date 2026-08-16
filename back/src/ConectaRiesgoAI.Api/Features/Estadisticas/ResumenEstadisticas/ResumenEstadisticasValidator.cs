using FluentValidation;

namespace ConectaRiesgoAI.Api.Features.Estadisticas.ResumenEstadisticas;

/// <summary>Valida los parámetros de consulta opcionales de <c>GET /api/estadisticas/resumen</c>.</summary>
public class ResumenEstadisticasValidator : AbstractValidator<ResumenEstadisticasQuery>
{
    public ResumenEstadisticasValidator()
    {
        RuleFor(x => x.RadioKm)
            .GreaterThan(0).WithMessage("El radio en kilómetros debe ser mayor que 0")
            .When(x => x.RadioKm is not null);
        RuleFor(x => x.Lat)
            .InclusiveBetween(-90, 90).WithMessage("La latitud debe estar entre -90 y 90")
            .When(x => x.Lat is not null);
        RuleFor(x => x.Lng)
            .InclusiveBetween(-180, 180).WithMessage("La longitud debe estar entre -180 y 180")
            .When(x => x.Lng is not null);
        // Sin lat/lng, el handler no puede calcular distancia y el filtro de radio nunca se
        // evalúa: en vez de degradar en silencio a "sin filtrar", se rechaza explícito.
        RuleFor(x => x)
            .Must(x => x.RadioKm is null || (x.Lat is not null && x.Lng is not null))
            .WithName("radioKm")
            .WithMessage("radioKm requiere que también se envíen lat y lng");
    }
}
