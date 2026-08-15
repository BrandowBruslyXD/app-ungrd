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

public class GeneradorTokenJwt(IOptions<OpcionesJwt> opciones) : IGeneradorTokenJwt
{
    public string Generar(Usuario usuario)
    {
        var config = opciones.Value;

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
            new Claim(ClaimTypes.Name, usuario.Nombre),
            new Claim(ClaimTypes.Email, usuario.Email),
            new Claim(ClaimTypes.Role, usuario.Rol.ToString())
        };

        var credenciales = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config.Secret)),
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: config.Issuer,
            audience: config.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(config.HorasDeVigencia),
            signingCredentials: credenciales);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
