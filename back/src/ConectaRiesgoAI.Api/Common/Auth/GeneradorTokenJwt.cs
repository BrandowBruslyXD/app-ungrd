using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using ConectaRiesgoAI.Api.Domain.Entities;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace ConectaRiesgoAI.Api.Common.Auth;

/// <summary>Emite el JWT que identifica a un usuario ya autenticado. Lo usan Registro y Login.</summary>
public interface IGeneradorTokenJwt
{
    string Generar(Usuario usuario);
}

/// <inheritdoc cref="IGeneradorTokenJwt" />
public class GeneradorTokenJwt(IOptions<OpcionesJwt> opciones) : IGeneradorTokenJwt
{
    // "role" corto: no es un nombre registrado en JwtRegisteredClaimNames, pero es el que
    // JwtSecurityTokenHandler.DefaultInboundClaimTypeMap reconoce y traduce a ClaimTypes.Role
    // al validar. Verificado con un test: reduce el token sin que UsuarioActual note la diferencia.
    private const string ClaimRolCorto = "role";

    /// <inheritdoc />
    public string Generar(Usuario usuario)
    {
        OpcionesJwt config = opciones.Value;

        // Nombres cortos donde el mapeo de entrada por omisión los traduce de vuelta a los
        // ClaimTypes largos que lee UsuarioActual (verificado con test); el token pesa menos en
        // cada request, que en conexión mala no es gratis. "name" no tiene ese mapeo automático
        // (también verificado), así que ese sí se manda con el ClaimType largo.
        Claim[] claims =
        [
            new Claim(JwtRegisteredClaimNames.Sub, usuario.Id.ToString()),
            new Claim(ClaimTypes.Name, usuario.Nombre),
            new Claim(JwtRegisteredClaimNames.Email, usuario.Email),
            new Claim(ClaimRolCorto, usuario.Rol.ToString())
        ];

        SigningCredentials credenciales = new(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config.Secret)),
            SecurityAlgorithms.HmacSha256);

        JwtSecurityToken token = new(
            issuer: config.Issuer,
            audience: config.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(config.HorasDeVigencia),
            signingCredentials: credenciales);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
