using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using ConectaRiesgoAI.Api.Common.Auth;
using ConectaRiesgoAI.Api.Domain.Entities;
using ConectaRiesgoAI.Api.Domain.Enums;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace ConectaRiesgoAI.Api.Tests.Common.Auth;

public class GeneradorTokenJwtTests
{
    private static readonly OpcionesJwt Opciones = new()
    {
        Secret = "clave-de-pruebas-unicamente-no-usar-en-produccion-32+",
        Issuer = "ConectaRiesgoAI.Tests",
        Audience = "ConectaRiesgoAI.Tests",
        HorasDeVigencia = 1
    };

    private static Usuario NuevoGestor() => new()
    {
        Id = 7,
        Nombre = "Carlos M.",
        Email = "carlos@ejemplo.com",
        PasswordHash = "hash-irrelevante-para-esta-prueba",
        Rol = Rol.Gestor,
        Municipio = "Bogotá"
    };

    [Fact]
    public void Generar_UsuarioValido_UsaClaimsCortosEnElTokenCrudo()
    {
        var generador = new GeneradorTokenJwt(Options.Create(Opciones));
        var usuario = NuevoGestor();

        var token = generador.Generar(usuario);

        // Nombres cortos a propósito: el token viaja en cada request y CLAUDE.md exige que la app
        // funcione bien con conexión mala. Se validan aquí sobre el JWT crudo, sin el mapeo de
        // entrada que aplica ValidateToken (eso lo cubre la prueba de abajo).
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
        Assert.Equal("7", jwt.Claims.Single(c => c.Type == JwtRegisteredClaimNames.Sub).Value);
        Assert.Equal("Gestor", jwt.Claims.Single(c => c.Type == "role").Value);
        Assert.Equal(usuario.Email, jwt.Claims.Single(c => c.Type == JwtRegisteredClaimNames.Email).Value);
    }

    [Fact]
    public void Generar_UsuarioValido_AlValidarSeMapeaALosClaimTypesQueLeeUsuarioActual()
    {
        var generador = new GeneradorTokenJwt(Options.Create(Opciones));
        var usuario = NuevoGestor();
        var token = generador.Generar(usuario);

        var parametros = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = Opciones.Issuer,
            ValidAudience = Opciones.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Opciones.Secret))
        };

        // Esto es exactamente lo que hace el middleware de JWT Bearer al autenticar una request:
        // valida y arma el ClaimsPrincipal. UsuarioActual lee ClaimTypes.*, así que si el mapeo de
        // entrada por omisión no tradujera los claims cortos de vuelta, esto fallaría en silencio.
        var principal = new JwtSecurityTokenHandler().ValidateToken(token, parametros, out _);

        Assert.Equal("7", principal.FindFirstValue(ClaimTypes.NameIdentifier));
        Assert.Equal(usuario.Nombre, principal.FindFirstValue(ClaimTypes.Name));
        Assert.Equal(usuario.Email, principal.FindFirstValue(ClaimTypes.Email));
        Assert.Equal(nameof(Rol.Gestor), principal.FindFirstValue(ClaimTypes.Role));
        Assert.True(principal.IsInRole(nameof(Rol.Gestor)));
    }
}
