using ConectaRiesgoAI.Api.Domain.Entities;
using ConectaRiesgoAI.Api.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace ConectaRiesgoAI.Api.Persistence.Seeding;

/// <summary>
/// Un usuario por rol para que la demo pueda loguearse sin pasar por /auth/registro
/// (que solo crea Ciudadanos). Solo corre en Development y solo si la tabla está vacía.
/// </summary>
public static class DatosDemo
{
    public const string PasswordDemo = "Demo1234!";

    public static async Task SembrarAsync(AppDbContext db, CancellationToken cancellationToken = default)
    {
        if (await db.Usuarios.AnyAsync(cancellationToken))
        {
            return;
        }

        var hash = BCrypt.Net.BCrypt.HashPassword(PasswordDemo);

        db.Usuarios.AddRange(
            new Usuario
            {
                Nombre = "Ciudadano Demo",
                Email = "ciudadano@conectariesgoai.com",
                PasswordHash = hash,
                Rol = Rol.Ciudadano,
                Municipio = "Bogotá"
            },
            new Usuario
            {
                Nombre = "Gestor Demo",
                Email = "gestor@conectariesgoai.com",
                PasswordHash = hash,
                Rol = Rol.Gestor,
                Municipio = "Bogotá"
            },
            new Usuario
            {
                Nombre = "Admin Demo",
                Email = "admin@conectariesgoai.com",
                PasswordHash = hash,
                Rol = Rol.Admin,
                Municipio = "Bogotá"
            });

        await db.SaveChangesAsync(cancellationToken);
    }
}
