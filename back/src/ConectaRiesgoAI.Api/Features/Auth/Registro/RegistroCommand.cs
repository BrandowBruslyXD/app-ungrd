using MediatR;

namespace ConectaRiesgoAI.Api.Features.Auth.Registro;

/// <summary>Petición de <c>POST /api/auth/registro</c> (ver CONTRATO-API.md).</summary>
public record RegistroCommand(string Nombre, string Email, string Password, string Municipio)
    : IRequest<RegistroResponse>;
