using ConectaRiesgoAI.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ConectaRiesgoAI.Api.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<Reporte> Reportes => Set<Reporte>();
    public DbSet<EventoCronologia> EventosCronologia => Set<EventoCronologia>();
    public DbSet<VerificacionSatelital> VerificacionesSatelitales => Set<VerificacionSatelital>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
