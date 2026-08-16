using FluentValidation;

namespace ConectaRiesgoAI.Api.Features.Ingesta.RegistrarCenso;

/// <summary>Reglas de forma de cada integrante del núcleo familiar dentro de <see cref="RegistrarCensoCommand"/>.</summary>
public class MiembroNucleoFamiliarInputValidator : AbstractValidator<MiembroNucleoFamiliarInput>
{
    /// <summary>Registra las reglas de forma de un integrante del núcleo familiar.</summary>
    public MiembroNucleoFamiliarInputValidator()
    {
        RuleFor(m => m.Nombres).NotEmpty().MaximumLength(120);
        RuleFor(m => m.Apellidos).NotEmpty().MaximumLength(120);
        RuleFor(m => m.Parentesco).IsInEnum();
        RuleFor(m => m.Edad).InclusiveBetween(0, 120);
        RuleFor(m => m.NumeroDocumento).MaximumLength(30);
        RuleFor(m => m.TipoDocumento).IsInEnum().When(m => m.TipoDocumento is not null);
    }
}
