using System.Security.Claims;
using ConectaRiesgoAI.Api.Common.Auth;
using ConectaRiesgoAI.Api.Domain.Entities;
using ConectaRiesgoAI.Api.Domain.Enums;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace ConectaRiesgoAI.Api.Tests.Common.Auth;

/// <summary>
/// Valida el token de <see cref="GeneradorTokenJwt"/> con el mismo <see cref="TokenHandler"/> y los
/// mismos <see cref="TokenValidationParameters"/> que arma <see cref="AuthExtensions.AgregarAutenticacion"/>
/// — el mecanismo real que usa el middleware, no una aproximación manual. Si una actualización de
/// paquete cambiara el valor por omisión de <c>MapInboundClaims</c>, esta prueba cae antes de que la
/// autenticación se rompa en producción.
/// </summary>
public class AuthExtensionsTests
{
    [Fact]
    public async Task AgregarAutenticacion_TokenDeGeneradorTokenJwt_ValidaConLosClaimTypesQueLeeUsuarioActual()
    {
        IConfiguration configuracion = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Secret"] = "clave-de-pruebas-unicamente-no-usar-en-produccion-32+",
                ["Jwt:Issuer"] = "ConectaRiesgoAI.Tests",
                ["Jwt:Audience"] = "ConectaRiesgoAI.Tests",
                ["Jwt:HorasDeVigencia"] = "1"
            })
            .Build();

        ServiceCollection servicios = new();
        servicios.AgregarAutenticacion(configuracion);
        using ServiceProvider proveedor = servicios.BuildServiceProvider();

        IGeneradorTokenJwt generador = proveedor.GetRequiredService<IGeneradorTokenJwt>();
        Usuario usuario = new()
        {
            Id = 7,
            Nombre = "Carlos M.",
            Email = "carlos@ejemplo.com",
            PasswordHash = "irrelevante-para-esta-prueba",
            Rol = Rol.Gestor,
            Municipio = "Bogotá"
        };
        string token = generador.Generar(usuario);

        JwtBearerOptions opcionesJwtBearer = proveedor.GetRequiredService<IOptionsMonitor<JwtBearerOptions>>()
            .Get(JwtBearerDefaults.AuthenticationScheme);
        TokenHandler tokenHandler = opcionesJwtBearer.TokenHandlers!.First();

        TokenValidationResult resultado = await tokenHandler.ValidateTokenAsync(
            token, opcionesJwtBearer.TokenValidationParameters);

        Assert.True(resultado.IsValid, resultado.Exception?.ToString());
        ClaimsPrincipal principal = new(resultado.ClaimsIdentity!);
        Assert.Equal("7", principal.FindFirstValue(ClaimTypes.NameIdentifier));
        Assert.Equal(usuario.Nombre, principal.FindFirstValue(ClaimTypes.Name));
        Assert.Equal(usuario.Email, principal.FindFirstValue(ClaimTypes.Email));
        Assert.Equal(nameof(Rol.Gestor), principal.FindFirstValue(ClaimTypes.Role));
        Assert.True(principal.IsInRole(nameof(Rol.Gestor)));
    }
}
