using System.Security.Claims;
using ConectaRiesgoAI.Api.Common.Auth;
using ConectaRiesgoAI.Api.Domain.Enums;
using Microsoft.AspNetCore.Http;

namespace ConectaRiesgoAI.Api.Tests.Common.Auth;

public class UsuarioActualTests
{
    private static UsuarioActual Crear(params Claim[] claims)
    {
        DefaultHttpContext contexto = new();
        if (claims.Length > 0)
        {
            contexto.User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Bearer"));
        }

        IHttpContextAccessor accessor = new HttpContextAccessor { HttpContext = contexto };
        return new UsuarioActual(accessor);
    }

    [Fact]
    public void Propiedades_SinHttpContext_DevuelvenNulosYNoAutenticado()
    {
        IHttpContextAccessor accessor = new HttpContextAccessor();
        UsuarioActual usuario = new(accessor);

        Assert.Null(usuario.Id);
        Assert.Null(usuario.Nombre);
        Assert.Null(usuario.Rol);
        Assert.False(usuario.EstaAutenticado);
    }

    [Fact]
    public void Propiedades_ConClaimsCompletos_ExtraeIdNombreYRol()
    {
        UsuarioActual usuario = Crear(
            new Claim(ClaimTypes.NameIdentifier, "7"),
            new Claim(ClaimTypes.Name, "Carlos M."),
            new Claim(ClaimTypes.Role, nameof(Rol.Gestor)));

        Assert.Equal(7, usuario.Id);
        Assert.Equal("Carlos M.", usuario.Nombre);
        Assert.Equal(Rol.Gestor, usuario.Rol);
        Assert.True(usuario.EstaAutenticado);
    }

    [Fact]
    public void Id_ClaimNoNumerico_DevuelveNull()
    {
        UsuarioActual usuario = Crear(new Claim(ClaimTypes.NameIdentifier, "no-es-numero"));

        Assert.Null(usuario.Id);
    }

    [Fact]
    public void Rol_ClaimDesconocido_DevuelveNull()
    {
        UsuarioActual usuario = Crear(new Claim(ClaimTypes.Role, "RolInexistente"));

        Assert.Null(usuario.Rol);
    }
}
