using FluentValidation;

namespace ConectaRiesgoAI.Api.Features.Auth.Login;

/// <summary>Reglas de entrada de login: solo forma, no si las credenciales son correctas (eso lo decide el handler).</summary>
public class LoginValidator : AbstractValidator<LoginCommand>
{
    public LoginValidator()
    {
        RuleFor(c => c.Email).NotEmpty().EmailAddress();
        // Mismo límite que en registro: por encima de 72 caracteres nunca puede coincidir con
        // el hash guardado (BCrypt trunca ahí), así que ni vale la pena mandarlo al handler.
        RuleFor(c => c.Password).NotEmpty().MaximumLength(72);
    }
}
