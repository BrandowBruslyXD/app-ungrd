using ConectaRiesgoAI.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ConectaRiesgoAI.Api.Persistence.Configurations;

public class VerificacionSatelitalConfiguration : IEntityTypeConfiguration<VerificacionSatelital>
{
    public void Configure(EntityTypeBuilder<VerificacionSatelital> builder)
    {
        builder.ToTable("verificaciones_satelitales");
        builder.HasKey(v => v.Id);

        builder.Property(v => v.Fuente).HasMaxLength(60).IsRequired();
        builder.Property(v => v.Detalle).HasMaxLength(300).IsRequired();

        // Un reporte solo tiene una verificación vigente: evita que dos consultas simultáneas del
        // detalle (la primera verificación) inserten dos filas y gasten doble cuota del MAP_KEY.
        builder.HasIndex(v => v.ReporteId).IsUnique();

        builder.HasOne(v => v.Reporte)
            .WithMany(r => r.VerificacionesSatelitales)
            .HasForeignKey(v => v.ReporteId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
