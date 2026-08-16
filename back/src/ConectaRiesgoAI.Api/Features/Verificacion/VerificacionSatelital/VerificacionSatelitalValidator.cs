using FluentValidation;

namespace ConectaRiesgoAI.Api.Features.Verificacion.VerificacionSatelital;

/// <summary>Valida los parámetros de <c>GET /api/verificacion/satelital</c>.</summary>
public class VerificacionSatelitalValidator : AbstractValidator<VerificacionSatelitalQuery>
{
    public VerificacionSatelitalValidator()
    {
        RuleFor(x => x.Lat)
            .InclusiveBetween(-90, 90).WithMessage("La latitud debe estar entre -90 y 90");
        RuleFor(x => x.Lng)
            .InclusiveBetween(-180, 180).WithMessage("La longitud debe estar entre -180 y 180");
        RuleFor(x => x.RadioKm)
            .GreaterThan(0).WithMessage("El radio en kilómetros debe ser mayor que 0")
            // Endpoint público sin autenticación: un radio enorme agranda el cuadro que se le
            // pide a FIRMS y gasta cuota del MAP_KEY sin aportar nada útil a una confirmación
            // puntual de incendio.
            .LessThanOrEqualTo(200).WithMessage("El radio en kilómetros no puede superar 200");
    }
}
