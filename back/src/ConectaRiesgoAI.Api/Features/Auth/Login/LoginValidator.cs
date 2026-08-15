using FluentValidation;

namespace ConectaRiesgoAI.Api.Features.Auth.Login;

/// <summary>Reglas de entrada de login: solo forma, no si las credenciales son correctas (eso lo decide el handler).</summary>
public class LoginValidator : AbstractValidator<LoginCommand>
{
    public LoginValidator()
    {
        RuleFor(c => c.Email).NotEmpty().EmailAddress();
        RuleFor(c => c.Password).NotEmpty();
    }
}
