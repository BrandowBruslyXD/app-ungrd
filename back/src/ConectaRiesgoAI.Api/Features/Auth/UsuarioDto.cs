using ConectaRiesgoAI.Api.Domain.Entities;
using ConectaRiesgoAI.Api.Domain.Enums;

namespace ConectaRiesgoAI.Api.Features.Auth;

/// <summary>
/// El objeto <c>usuario</c> que devuelven Registro, Login y ObtenerPerfil — misma forma en los tres,
/// por eso vive aquí y no repetido en cada caso de uso (ver CONTRATO-API.md).
/// </summary>
public record UsuarioDto(int Id, string Nombre, string Email, Rol Rol, string Municipio)
{
    public static UsuarioDto DeEntidad(Usuario usuario) =>
        new(usuario.Id, usuario.Nombre, usuario.Email, usuario.Rol, usuario.Municipio);
}
