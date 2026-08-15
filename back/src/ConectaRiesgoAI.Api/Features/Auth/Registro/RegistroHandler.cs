using ConectaRiesgoAI.Api.Common.Auth;
using ConectaRiesgoAI.Api.Domain.Entities;
using ConectaRiesgoAI.Api.Domain.Enums;
using ConectaRiesgoAI.Api.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ConectaRiesgoAI.Api.Features.Auth.Registro;

/// <summary>Crea un usuario con rol Ciudadano y le devuelve el token de una vez: no hace falta loguearse después de registrarse.</summary>
public class RegistroHandler(AppDbContext db, IGeneradorTokenJwt generadorToken)
    : IRequestHandler<RegistroCommand, RegistroResponse>
{
    public async Task<RegistroResponse> Handle(RegistroCommand command, CancellationToken cancellationToken)
    {
        var email = command.Email.Trim().ToLowerInvariant();

        var yaExiste = await db.Usuarios.AnyAsync(u => u.Email == email, cancellationToken);
        if (yaExiste)
        {
            throw new InvalidOperationException("El correo ya está registrado");
        }

        var usuario = new Usuario
        {
            Nombre = command.Nombre.Trim(),
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(command.Password),
            Rol = Rol.Ciudadano,
            Municipio = command.Municipio.Trim()
        };

        db.Usuarios.Add(usuario);
        await db.SaveChangesAsync(cancellationToken);

        var token = generadorToken.Generar(usuario);
        return new RegistroResponse(token, UsuarioDto.DeEntidad(usuario));
    }
}
