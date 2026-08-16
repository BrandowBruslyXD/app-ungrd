using System.Text;
using FluentValidation;

namespace ConectaRiesgoAI.Api.Features.Auth.Registro;

/// <summary>Reglas de entrada de registro: forma de los campos, no si el correo ya existe (eso lo decide el handler).</summary>
public class RegistroValidator : AbstractValidator<RegistroCommand>
{
    public RegistroValidator()
    {
        RuleFor(c => c.Nombre).NotEmpty().MaximumLength(150);
        RuleFor(c => c.Email).NotEmpty().EmailAddress().MaximumLength(200);
        // BCrypt ignora todo lo que pase el byte 72 de la codificación UTF-8: por eso se cuentan
        // bytes con GetByteCount y no caracteres con MaximumLength, que con tildes o "ñ" no da lo
        // mismo. Sin este límite, dos contraseñas largas que compartan ese prefijo de 72 bytes
        // hashearían igual sin que nadie se entere.
        RuleFor(c => c.Password).NotEmpty()
            .MinimumLength(8).WithMessage("La contraseña debe tener entre 8 y 72 caracteres")
            .Must(p => Encoding.UTF8.GetByteCount(p) <= 72)
                .WithMessage("La contraseña debe tener entre 8 y 72 caracteres");
        RuleFor(c => c.Municipio).NotEmpty().MaximumLength(120);
    }
}
