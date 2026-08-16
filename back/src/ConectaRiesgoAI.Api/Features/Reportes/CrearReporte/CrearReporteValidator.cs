using FluentValidation;

namespace ConectaRiesgoAI.Api.Features.Reportes.CrearReporte;

public class CrearReporteValidator : AbstractValidator<CrearReporteCommand>
{
    public CrearReporteValidator()
    {
        RuleFor(x => x.Tipo).IsInEnum().WithMessage("El tipo de reporte no es válido");
        RuleFor(x => x.Descripcion)
            .NotEmpty().WithMessage("La descripción es obligatoria")
            .MaximumLength(2000).WithMessage("La descripción no puede superar los 2000 caracteres");
        RuleFor(x => x.Municipio)
            .NotEmpty().WithMessage("El municipio es obligatorio")
            .MaximumLength(120).WithMessage("El municipio no puede superar los 120 caracteres");
        RuleFor(x => x.Latitud).InclusiveBetween(-90, 90).WithMessage("La latitud debe estar entre -90 y 90");
        RuleFor(x => x.Longitud).InclusiveBetween(-180, 180).WithMessage("La longitud debe estar entre -180 y 180");
        RuleFor(x => x.Direccion).MaximumLength(300).WithMessage("La dirección no puede superar los 300 caracteres");
        RuleFor(x => x.UrlFoto).MaximumLength(500).WithMessage("La URL de la foto no puede superar los 500 caracteres");
    }
}
