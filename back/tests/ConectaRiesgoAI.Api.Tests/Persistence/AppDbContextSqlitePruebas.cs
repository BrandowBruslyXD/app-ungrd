using ConectaRiesgoAI.Api.Persistence;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace ConectaRiesgoAI.Api.Tests.Persistence;

/// <summary>
/// A diferencia de <see cref="AppDbContextPruebas"/> (proveedor InMemory), SQLite sí aplica
/// los índices únicos definidos en las configuraciones de EF Core. Se usa solo donde una prueba
/// necesita verificar un comportamiento que depende de esa restricción (por ejemplo, colisiones
/// del índice único en <c>Reporte.Codigo</c>).
/// </summary>
internal static class AppDbContextSqlitePruebas
{
    /// <summary>
    /// La conexión SQLite en memoria vive mientras esté abierta: hay que mantenerla y
    /// desecharla junto con el contexto para que la base no desaparezca entre consultas.
    /// </summary>
    public static (AppDbContext Contexto, SqliteConnection Conexion) Crear()
    {
        var conexion = new SqliteConnection("DataSource=:memory:");
        conexion.Open();

        var opciones = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(conexion)
            .Options;

        var contexto = new AppDbContext(opciones);
        contexto.Database.EnsureCreated();

        return (contexto, conexion);
    }
}
