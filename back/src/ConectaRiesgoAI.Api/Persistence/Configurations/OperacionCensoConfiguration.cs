using ConectaRiesgoAI.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ConectaRiesgoAI.Api.Persistence.Configurations;

public class OperacionCensoConfiguration : IEntityTypeConfiguration<OperacionCenso>
{
    public void Configure(EntityTypeBuilder<OperacionCenso> builder)
    {
        builder.ToTable("operaciones_censo");
        builder.HasKey(o => o.Id);

        builder.Property(o => o.Codigo).HasMaxLength(40).IsRequired();
        builder.Property(o => o.Municipio).HasMaxLength(120).IsRequired();
        builder.Property(o => o.BarrioVereda).HasMaxLength(150);

        builder.HasIndex(o => o.Codigo).IsUnique();

        // El handler busca por estas tres para reutilizar la jornada abierta del día.
        builder.HasIndex(o => new { o.Municipio, o.BrigadistaId, o.CerradaEn });

        builder.HasOne(o => o.Brigadista)
            .WithMany()
            .HasForeignKey(o => o.BrigadistaId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(o => o.PersonasAfectadas)
            .WithOne(p => p.OperacionCenso)
            .HasForeignKey(p => p.OperacionCensoId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
