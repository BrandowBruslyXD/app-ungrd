using ConectaRiesgoAI.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ConectaRiesgoAI.Api.Persistence.Configurations;

public class MiembroNucleoFamiliarConfiguration : IEntityTypeConfiguration<MiembroNucleoFamiliar>
{
    public void Configure(EntityTypeBuilder<MiembroNucleoFamiliar> builder)
    {
        builder.ToTable("miembros_nucleo_familiar");
        builder.HasKey(m => m.Id);

        builder.Property(m => m.Nombres).HasMaxLength(120).IsRequired();
        builder.Property(m => m.Apellidos).HasMaxLength(120).IsRequired();
        builder.Property(m => m.NumeroDocumento).HasMaxLength(30);

        builder.Property(m => m.Parentesco).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(m => m.TipoDocumento).HasConversion<string>().HasMaxLength(20);

        builder.HasIndex(m => m.PersonaAfectadaId);
    }
}
