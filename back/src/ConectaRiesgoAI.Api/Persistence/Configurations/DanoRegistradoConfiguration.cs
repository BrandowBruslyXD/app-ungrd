using ConectaRiesgoAI.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ConectaRiesgoAI.Api.Persistence.Configurations;

public class DanoRegistradoConfiguration : IEntityTypeConfiguration<DanoRegistrado>
{
    public void Configure(EntityTypeBuilder<DanoRegistrado> builder)
    {
        builder.ToTable("danos_registrados");
        builder.HasKey(d => d.Id);

        builder.Property(d => d.Descripcion).HasMaxLength(1000);
        builder.Property(d => d.ValorEstimado).HasPrecision(14, 2);
        builder.Property(d => d.HectareasAfectadas).HasPrecision(10, 2);

        builder.Property(d => d.Categoria).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(d => d.Nivel).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(d => d.TipoInmueble).HasConversion<string>().HasMaxLength(20);

        builder.HasIndex(d => d.PersonaAfectadaId);
    }
}
