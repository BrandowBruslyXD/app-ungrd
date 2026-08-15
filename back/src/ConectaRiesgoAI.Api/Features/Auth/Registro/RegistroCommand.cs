using MediatR;

namespace ConectaRiesgoAI.Api.Features.Auth.Registro;

public record RegistroCommand(string Nombre, string Email, string Password, string Municipio)
    : IRequest<RegistroResponse>;
