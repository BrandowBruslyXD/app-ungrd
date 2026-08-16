using ConectaRiesgoAI.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ConectaRiesgoAI.Api.Persistence.Configurations;

public class PersonaAfectadaConfiguration : IEntityTypeConfiguration<PersonaAfectada>
{
    public void Configure(EntityTypeBuilder<PersonaAfectada> builder)
    {
        builder.ToTable("personas_afectadas");
        builder.HasKey(p => p.Id);

        builder.Property(p => p.Codigo).HasMaxLength(24).IsRequired();
        builder.Property(p => p.Nombres).HasMaxLength(120).IsRequired();
        builder.Property(p => p.Apellidos).HasMaxLength(120).IsRequired();
        builder.Property(p => p.NumeroDocumento).HasMaxLength(30);
        builder.Property(p => p.Telefono).HasMaxLength(20);
        builder.Property(p => p.TelefonoAlterno).HasMaxLength(20);
        builder.Property(p => p.Email).HasMaxLength(160);
        builder.Property(p => p.Departamento).HasMaxLength(80).IsRequired();
        builder.Property(p => p.Ciudad).HasMaxLength(80).IsRequired();
        builder.Property(p => p.Comuna).HasMaxLength(80);
        builder.Property(p => p.DireccionResidencia).HasMaxLength(200).IsRequired();
        builder.Property(p => p.ObservacionesSalud).HasMaxLength(500);

        builder.Property(p => p.TipoDocumento).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(p => p.Genero).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(p => p.PerteneceGrupoEtnico).HasConversion<string>().HasMaxLength(20);
        builder.Property(p => p.Estado).HasConversion<string>().HasMaxLength(20).IsRequired();

        builder.HasIndex(p => p.Codigo).IsUnique();
        builder.HasIndex(p => p.Estado);

        // Cédula no repetida dentro del mismo evento (ver docs del issue #48). SinDocumento no
        // tiene NumeroDocumento, por eso el filtro: Postgres no cuenta los NULL como duplicados.
        builder.HasIndex(p => new { p.OperacionCensoId, p.NumeroDocumento })
            .IsUnique()
            .HasFilter("\"NumeroDocumento\" IS NOT NULL")
            .HasDatabaseName(IndicesPostgres.PersonasAfectadasOperacionCensoNumeroDocumento);

        builder.HasOne(p => p.Reporte)
            .WithMany()
            .HasForeignKey(p => p.ReporteId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(p => p.RegistradoPor)
            .WithMany()
            .HasForeignKey(p => p.RegistradoPorId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(p => p.NucleoFamiliar)
            .WithOne(m => m.PersonaAfectada)
            .HasForeignKey(m => m.PersonaAfectadaId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(p => p.Danos)
            .WithOne(d => d.PersonaAfectada)
            .HasForeignKey(d => d.PersonaAfectadaId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
