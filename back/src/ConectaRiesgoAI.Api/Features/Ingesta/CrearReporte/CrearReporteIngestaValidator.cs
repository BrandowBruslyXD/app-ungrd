using ConectaRiesgoAI.Api.Domain.Enums;
using FluentValidation;

namespace ConectaRiesgoAI.Api.Features.Ingesta.CrearReporte;

/// <summary>Reglas de forma. Que el teléfono ya tenga o no Usuario lo decide el handler.</summary>
public class CrearReporteIngestaValidator : AbstractValidator<CrearReporteIngestaCommand>
{
    public CrearReporteIngestaValidator()
    {
        RuleFor(c => c.Telefono)
            .NotEmpty().WithMessage("El teléfono es obligatorio")
            .MaximumLength(20).WithMessage("El teléfono no puede superar los 20 caracteres")
            .Matches(@"^\d{7,20}$").WithMessage("El teléfono debe contener solo dígitos (mínimo 7)");
        RuleFor(c => c.NombreContacto).MaximumLength(150);
        RuleFor(c => c.Clase).NotEmpty()
            .Must(v => MapeoClaseReporte.TryMapear(v, out _))
            .WithMessage("Clase debe ser 'afectacion_propia' o 'aviso_evento'");
        RuleFor(c => c.Descripcion).NotEmpty().MaximumLength(1900);
        RuleFor(c => c.UbicacionTexto).MaximumLength(300);
        RuleFor(c => c.NivelDano).MaximumLength(80);
        RuleFor(c => c.Necesidad).MaximumLength(80);
        RuleFor(c => c.UrlFoto).MaximumLength(500);
        // Web queda fuera a propósito: este endpoint es el de los canales conversacionales.
        // Un reporte hecho desde la aplicación entra por POST /api/reportes con su sesión, y
        // aceptarlo aquí permitiría atribuirle a un tercero un reporte que no hizo.
        RuleFor(c => c.Canal)
            .Must(c => c is null or CanalOrigen.WhatsApp or CanalOrigen.Telefono)
            .WithMessage("Canal debe ser 'WhatsApp' o 'Telefono'");
    }
}
