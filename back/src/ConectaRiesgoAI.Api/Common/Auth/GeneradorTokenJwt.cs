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
    /// <inheritdoc />
    public string Generar(Usuario usuario)
    {
        OpcionesJwt config = opciones.Value;

        Claim[] claims =
        [
            new Claim(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
            new Claim(ClaimTypes.Name, usuario.Nombre),
            new Claim(ClaimTypes.Email, usuario.Email),
            new Claim(ClaimTypes.Role, usuario.Rol.ToString())
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
