using ConectaRiesgoAI.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ConectaRiesgoAI.Api.Persistence.Configurations;

/// <inheritdoc />
public class OperacionCensoConfiguration : IEntityTypeConfiguration<OperacionCenso>
{
    /// <inheritdoc />
    public void Configure(EntityTypeBuilder<OperacionCenso> builder)
    {
        builder.ToTable("operaciones_censo");
        builder.HasKey(o => o.Id);

        builder.Property(o => o.Codigo).HasMaxLength(40).IsRequired();
        builder.Property(o => o.Municipio).HasMaxLength(120).IsRequired();
        builder.Property(o => o.BarrioVereda).HasMaxLength(150);

        builder.HasIndex(o => o.Codigo).IsUnique();

        // Único y filtrado por jornada abierta: sin esto, dos peticiones concurrentes del mismo
        // brigadista para el mismo municipio pasan ambas la comprobación de "no hay una abierta"
        // y crean dos OperacionCenso abiertas a la vez (cada una con un Codigo distinto, así que
        // no chocan entre sí) — el siguiente SingleOrDefaultAsync del handler encontraría más de
        // una fila y lanzaría InvalidOperationException. Este índice hace que la segunda inserción
        // choque en base de datos, donde el handler ya sabe reintentar.
        builder.HasIndex(o => new { o.BrigadistaId, o.Municipio })
            .IsUnique()
            .HasFilter("\"CerradaEn\" IS NULL")
            .HasDatabaseName(IndicesPostgres.OperacionesCensoBrigadistaMunicipioAbierta);

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
