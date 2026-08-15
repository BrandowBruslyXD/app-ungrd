using FluentValidation;

namespace ConectaRiesgoAI.Api.Features.Auth.Registro;

public class RegistroValidator : AbstractValidator<RegistroCommand>
{
    public RegistroValidator()
    {
        RuleFor(c => c.Nombre).NotEmpty().MaximumLength(150);
        RuleFor(c => c.Email).NotEmpty().EmailAddress().MaximumLength(200);
        RuleFor(c => c.Password).NotEmpty().MinimumLength(8)
            .WithMessage("La contraseña debe tener al menos 8 caracteres");
        RuleFor(c => c.Municipio).NotEmpty().MaximumLength(120);
    }
}
