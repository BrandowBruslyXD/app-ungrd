using ConectaRiesgoAI.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ConectaRiesgoAI.Api.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<Reporte> Reportes => Set<Reporte>();
    public DbSet<EventoCronologia> EventosCronologia => Set<EventoCronologia>();
    public DbSet<VerificacionSatelital> VerificacionesSatelitales => Set<VerificacionSatelital>();
    public DbSet<OperacionCenso> OperacionesCenso => Set<OperacionCenso>();
    public DbSet<PersonaAfectada> PersonasAfectadas => Set<PersonaAfectada>();
    public DbSet<MiembroNucleoFamiliar> MiembrosNucleoFamiliar => Set<MiembroNucleoFamiliar>();
    public DbSet<DanoRegistrado> DanosRegistrados => Set<DanoRegistrado>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
