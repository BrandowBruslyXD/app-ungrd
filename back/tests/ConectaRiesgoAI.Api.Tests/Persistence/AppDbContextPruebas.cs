using ConectaRiesgoAI.Api.Domain.Entities;
using ConectaRiesgoAI.Api.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ConectaRiesgoAI.Api.Tests.Persistence;

/// <summary>Fábrica de un <see cref="AppDbContext"/> en memoria, aislado por prueba.</summary>
internal static class AppDbContextPruebas
{
    public static AppDbContext Crear() => new(CrearOpciones(Guid.NewGuid().ToString()));

    /// <summary>
    /// Contexto sobre el almacén en memoria <paramref name="nombreBaseDeDatos"/> (el mismo que
    /// se usó para sembrar los datos) pero que lanza <see cref="DbUpdateException"/> al guardar
    /// una <c>VerificacionSatelital</c> nueva: permite probar el camino de degradación cuando la
    /// base de datos falla.
    /// </summary>
    public static AppDbContext CrearQueFallaAlGuardarVerificaciones(string nombreBaseDeDatos) =>
        new AppDbContextQueFallaAlGuardarVerificaciones(CrearOpciones(nombreBaseDeDatos));

    /// <summary>Contexto en memoria con nombre explícito, para compartir el almacén entre dos contextos de la misma prueba.</summary>
    public static AppDbContext CrearConNombre(string nombreBaseDeDatos) => new(CrearOpciones(nombreBaseDeDatos));

    private static DbContextOptions<AppDbContext> CrearOpciones(string nombre) =>
        new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(nombre)
            .Options;

    private sealed class AppDbContextQueFallaAlGuardarVerificaciones(DbContextOptions<AppDbContext> options)
        : AppDbContext(options)
    {
        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            bool agregandoVerificacion = ChangeTracker.Entries<VerificacionSatelital>()
                .Any(e => e.State == EntityState.Added);
            if (agregandoVerificacion)
            {
                throw new DbUpdateException("Falla simulada de base de datos al guardar la verificación satelital.");
            }

            return base.SaveChangesAsync(cancellationToken);
        }
    }
}
