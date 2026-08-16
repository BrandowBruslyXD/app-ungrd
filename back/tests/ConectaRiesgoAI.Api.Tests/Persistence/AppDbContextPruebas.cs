using ConectaRiesgoAI.Api.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ConectaRiesgoAI.Api.Tests.Persistence;

/// <summary>Fábrica de un <see cref="AppDbContext"/> en memoria, aislado por prueba.</summary>
internal static class AppDbContextPruebas
{
    public static AppDbContext Crear()
    {
        var opciones = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new AppDbContext(opciones);
    }
}
