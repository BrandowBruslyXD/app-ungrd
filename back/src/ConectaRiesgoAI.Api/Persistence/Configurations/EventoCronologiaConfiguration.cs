using ConectaRiesgoAI.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ConectaRiesgoAI.Api.Persistence.Configurations;

public class EventoCronologiaConfiguration : IEntityTypeConfiguration<EventoCronologia>
{
    public void Configure(EntityTypeBuilder<EventoCronologia> builder)
    {
        builder.ToTable("eventos_cronologia");
        builder.HasKey(e => e.Id);

        builder.Property(e => e.Nota).HasMaxLength(500).IsRequired();
        builder.Property(e => e.Responsable).HasMaxLength(150).IsRequired();
        builder.Property(e => e.Estado).HasConversion<string>().HasMaxLength(20).IsRequired();

        builder.HasIndex(e => e.ReporteId);
    }
}
