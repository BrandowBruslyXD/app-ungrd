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
    public void Generar_UsuarioValido_IncluyeElRolComoClaim()
    {
        var generador = new GeneradorTokenJwt(Options.Create(Opciones));
        var usuario = NuevoGestor();

        var token = generador.Generar(usuario);

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
        Assert.Equal(nameof(Rol.Gestor), jwt.Claims.Single(c => c.Type == ClaimTypes.Role).Value);
        Assert.Equal("7", jwt.Claims.Single(c => c.Type == ClaimTypes.NameIdentifier).Value);
        Assert.Equal(usuario.Email, jwt.Claims.Single(c => c.Type == ClaimTypes.Email).Value);
    }

    [Fact]
    public void Generar_UsuarioValido_ProduceUnTokenQueValidaConLaMismaClave()
    {
        var generador = new GeneradorTokenJwt(Options.Create(Opciones));
        var token = generador.Generar(NuevoGestor());

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

        // No debe lanzar: si la firma o los datos del token no cuadran con la config, esto revienta.
        new JwtSecurityTokenHandler().ValidateToken(token, parametros, out _);
    }
}
