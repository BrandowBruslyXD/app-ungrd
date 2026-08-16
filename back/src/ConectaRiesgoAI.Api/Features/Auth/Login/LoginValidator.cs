using System.Text;
using FluentValidation;

namespace ConectaRiesgoAI.Api.Features.Auth.Login;

/// <summary>Reglas de entrada de login: solo forma, no si las credenciales son correctas (eso lo decide el handler).</summary>
public class LoginValidator : AbstractValidator<LoginCommand>
{
    public LoginValidator()
    {
        RuleFor(c => c.Email).NotEmpty().EmailAddress();
        // Mismo límite que en registro, contado en bytes UTF-8 (no caracteres): por encima de
        // 72 bytes nunca puede coincidir con el hash guardado, BCrypt lo trunca ahí.
        // Cascade(Stop): si Password llega null (NotEmpty falla), no debe seguir a Must —
        // GetByteCount(null) lanza ArgumentNullException, no un error de validación.
        RuleFor(c => c.Password).Cascade(CascadeMode.Stop).NotEmpty()
            .Must(p => Encoding.UTF8.GetByteCount(p) <= 72)
                .WithMessage("La contraseña no puede tener más de 72 bytes");
    }
}
