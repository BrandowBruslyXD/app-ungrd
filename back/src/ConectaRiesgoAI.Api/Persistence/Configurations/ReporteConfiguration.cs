using ConectaRiesgoAI.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ConectaRiesgoAI.Api.Persistence.Configurations;

public class ReporteConfiguration : IEntityTypeConfiguration<Reporte>
{
    public void Configure(EntityTypeBuilder<Reporte> builder)
    {
        builder.ToTable("reportes");
        builder.HasKey(r => r.Id);

        builder.Property(r => r.Codigo).HasMaxLength(30).IsRequired();
        builder.Property(r => r.Descripcion).HasMaxLength(2000).IsRequired();
        builder.Property(r => r.Municipio).HasMaxLength(120).IsRequired();
        builder.Property(r => r.Direccion).HasMaxLength(300);
        builder.Property(r => r.UrlFoto).HasMaxLength(500);

        builder.Property(r => r.Tipo).HasConversion<string>().HasMaxLength(30).IsRequired();
        builder.Property(r => r.Estado).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(r => r.Prioridad).HasConversion<string>().HasMaxLength(10).IsRequired();

        builder.HasIndex(r => r.Codigo).IsUnique();

        // El mapa y el dashboard filtran por estas tres todo el tiempo.
        builder.HasIndex(r => r.Estado);
        builder.HasIndex(r => r.Municipio);
        builder.HasIndex(r => r.CreadoEn);

        builder.HasOne(r => r.Usuario)
            .WithMany(u => u.Reportes)
            .HasForeignKey(r => r.UsuarioId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(r => r.Cronologia)
            .WithOne(e => e.Reporte)
            .HasForeignKey(e => e.ReporteId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
