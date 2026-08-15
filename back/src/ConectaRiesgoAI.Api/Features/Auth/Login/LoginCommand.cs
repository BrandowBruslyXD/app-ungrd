using MediatR;

namespace ConectaRiesgoAI.Api.Features.Auth.Login;

public record LoginCommand(string Email, string Password) : IRequest<LoginResponse>;
