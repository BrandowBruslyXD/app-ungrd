using FluentValidation;

namespace ConectaRiesgoAI.Api.Features.Evidencias.SubirEvidencia;

/// <summary>Los límites del issue #47: 5 MB, solo imágenes.</summary>
public class SubirEvidenciaValidator : AbstractValidator<SubirEvidenciaCommand>
{
    private const long TamanoMaximoBytes = 5 * 1024 * 1024;
    private static readonly string[] TiposPermitidos = ["image/jpeg", "image/png", "image/webp"];

    public SubirEvidenciaValidator()
    {
        RuleFor(c => c.TamanoBytes)
            .LessThanOrEqualTo(TamanoMaximoBytes)
            .WithMessage("El archivo no puede pesar más de 5 MB.");

        RuleFor(c => c.TipoContenido)
            .Must(tipo => TiposPermitidos.Contains(tipo))
            .WithMessage("Solo se aceptan imágenes JPEG, PNG o WEBP.");
    }
}
