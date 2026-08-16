using FluentValidation;

namespace ConectaRiesgoAI.Api.Features.Ingesta.RegistrarCenso;

/// <summary>
/// Reglas de forma y las dos que no dependen de la base de datos: consentimiento y declaración
/// de veracidad. Si el brigadista está acreditado o si la cédula ya existe en el evento lo decide
/// el handler, porque necesita consultar la base de datos.
/// </summary>
public class RegistrarCensoValidator : AbstractValidator<RegistrarCensoCommand>
{
    /// <summary>Registra las reglas de forma y las dos que no dependen de la base de datos.</summary>
    public RegistrarCensoValidator()
    {
        RuleFor(c => c.Telefono)
            .NotEmpty().WithMessage("El teléfono es obligatorio")
            .MaximumLength(20).WithMessage("El teléfono no puede superar los 20 caracteres")
            .Matches(@"^\d{7,20}$").WithMessage("El teléfono debe contener solo dígitos (mínimo 7)");

        RuleFor(c => c.Municipio).NotEmpty().MaximumLength(120);
        RuleFor(c => c.BarrioVereda).MaximumLength(150);

        // Ley 1581 de 2012: sin consentimiento explícito no se guarda nada. No es burocracia,
        // es lo que hace legal el registro (ver docs/MODELO-DATOS.md, sección de privacidad).
        RuleFor(c => c.Consentimiento)
            .Equal(true).WithMessage("Sin consentimiento del titular no se puede registrar el censo");
        RuleFor(c => c.DeclaracionVeracidad)
            .Equal(true).WithMessage("La persona debe declarar que la información es cierta");

        RuleFor(c => c.Nombres).NotEmpty().MaximumLength(120);
        RuleFor(c => c.Apellidos).NotEmpty().MaximumLength(120);
        RuleFor(c => c.TipoDocumento).IsInEnum();
        RuleFor(c => c.NumeroDocumento).MaximumLength(30);
        RuleFor(c => c.Edad).InclusiveBetween(0, 120);
        RuleFor(c => c.Genero).IsInEnum();
        RuleFor(c => c.TelefonoContacto).MaximumLength(20);

        RuleFor(c => c.Departamento).NotEmpty().MaximumLength(80);
        RuleFor(c => c.Ciudad).NotEmpty().MaximumLength(80);
        RuleFor(c => c.DireccionResidencia).NotEmpty().MaximumLength(200);
        RuleFor(c => c.Latitud).InclusiveBetween(-90, 90).When(c => c.Latitud is not null);
        RuleFor(c => c.Longitud).InclusiveBetween(-180, 180).When(c => c.Longitud is not null);

        RuleFor(c => c.PerteneceGrupoEtnico).IsInEnum().When(c => c.PerteneceGrupoEtnico is not null);
        RuleFor(c => c.EstadoVivienda).MaximumLength(300);
        RuleFor(c => c.Necesidad).MaximumLength(200);

        RuleFor(c => c.MiembrosNucleo)
            .Must(m => m is null || m.Count <= 20)
            .WithMessage("No puede haber más de 20 integrantes de núcleo familiar en un solo registro");
        RuleForEach(c => c.MiembrosNucleo).SetValidator(new MiembroNucleoFamiliarInputValidator());
    }
}
