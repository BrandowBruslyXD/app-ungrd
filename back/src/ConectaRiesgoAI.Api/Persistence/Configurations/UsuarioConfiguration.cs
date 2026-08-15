using ConectaRiesgoAI.Api.Domain.Entities;
using ConectaRiesgoAI.Api.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ConectaRiesgoAI.Api.Persistence.Configurations;

public class UsuarioConfiguration : IEntityTypeConfiguration<Usuario>
{
    // Contraseña "Demo1234!" hasheada con BCrypt. Solo para poder probar login en la demo:
    // datos inventados, nunca una credencial real (ver CLAUDE.md, sección Ley 1581).
    private const string HashDemo = "$2b$12$08eRl6W5Vpj8HwNAAQ3NUOUQOM.aG/NA.WTBc5LbMWjN9jz.3mwJ.";
    private static readonly DateTime FechaSeed = new(2026, 8, 15, 0, 0, 0, DateTimeKind.Utc);

    public void Configure(EntityTypeBuilder<Usuario> builder)
    {
        builder.ToTable("usuarios");
        builder.HasKey(u => u.Id);

        builder.Property(u => u.Nombre).HasMaxLength(150).IsRequired();
        builder.Property(u => u.Email).HasMaxLength(200).IsRequired();
        builder.Property(u => u.PasswordHash).IsRequired();
        builder.Property(u => u.Municipio).HasMaxLength(120).IsRequired();

        // Como texto y no como número: así la tabla se lee sin traducir nada.
        builder.Property(u => u.Rol).HasConversion<string>().HasMaxLength(20).IsRequired();

        builder.HasIndex(u => u.Email).IsUnique();

        // Un usuario de cada rol para poder probar la demo sin registrar nada a mano.
        builder.HasData(
            new Usuario
            {
                Id = 1,
                Nombre = "Ana Ciudadana",
                Email = "ciudadano@conectariesgoai.demo",
                PasswordHash = HashDemo,
                Rol = Rol.Ciudadano,
                Municipio = "Bogotá",
                CreadoEn = FechaSeed
            },
            new Usuario
            {
                Id = 2,
                Nombre = "Carlos Gestor",
                Email = "gestor@conectariesgoai.demo",
                PasswordHash = HashDemo,
                Rol = Rol.Gestor,
                Municipio = "Bogotá",
                CreadoEn = FechaSeed
            },
            new Usuario
            {
                Id = 3,
                Nombre = "Admin Sistema",
                Email = "admin@conectariesgoai.demo",
                PasswordHash = HashDemo,
                Rol = Rol.Admin,
                Municipio = "Bogotá",
                CreadoEn = FechaSeed
            });
    }
}
