using MediatR;

namespace ConectaRiesgoAI.Api.Features.Auth.ObtenerPerfil;

/// <summary>Sin parámetros a propósito: el usuario sale del token, nunca de lo que mande el cliente.</summary>
public record ObtenerPerfilQuery : IRequest<UsuarioDto>;
