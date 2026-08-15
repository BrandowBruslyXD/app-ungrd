using MediatR;

namespace ConectaRiesgoAI.Api.Features.Auth.Login;

/// <summary>Petición de <c>POST /api/auth/login</c> (ver CONTRATO-API.md).</summary>
public record LoginCommand(string Email, string Password) : IRequest<LoginResponse>;
