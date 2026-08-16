using ConectaRiesgoAI.Api.Common.Reportes;
using ConectaRiesgoAI.Api.Domain.Entities;
using ConectaRiesgoAI.Api.Domain.Enums;
using ConectaRiesgoAI.Api.Persistence;
using ConectaRiesgoAI.Api.Tests.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ConectaRiesgoAI.Api.Tests.Common.Reportes;

public class BuscadorReporteIdempotenteTests
{
    private static AppDbContext NuevoContexto() => new(
        new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task BuscarExistente_ReferenciaVacia_DevuelveNull(string? referencia)
    {
        using AppDbContext db = NuevoContexto();
        BuscadorReporteIdempotente buscador = new(db);

        Reporte? resultado = await buscador.BuscarExistenteAsync(
            CanalOrigen.WhatsApp, referencia, CancellationToken.None);

        Assert.Null(resultado);
    }

    [Fact]
    public void EsDuplicado_InnerExceptionNoEsPostgres_DevuelveFalse()
    {
        BuscadorReporteIdempotente buscador = new(NuevoContexto());
        DbUpdateException excepcion = new("otro", new InvalidOperationException());

        Assert.False(buscador.EsDuplicadoDeReferenciaExterna(excepcion));
    }

    [Fact]
    public async Task EsDuplicado_ReferenciaExternaDuplicadaEnSqlite_DevuelveTrue()
    {
        (AppDbContext contexto, Microsoft.Data.Sqlite.SqliteConnection conexion) = AppDbContextSqlitePruebas.Crear();
        using var contextoDesechable = contexto;
        using var conexionDesechable = conexion;

        contexto.Usuarios.Add(new Usuario
        {
            Nombre = "María R.",
            Email = "maria@ejemplo.com",
            PasswordHash = "hash",
            Municipio = "Soacha",
            Telefono = "573001234567"
        });
        await contexto.SaveChangesAsync();

        contexto.Reportes.Add(new Reporte
        {
            Codigo = "RPT-2026-08-16-0100",
            Tipo = TipoReporte.Otro,
            Descripcion = "Primera llamada",
            Municipio = "Soacha",
            Canal = CanalOrigen.WhatsApp,
            IdentificadorCanal = IdentificadorCanalReporte.ParaTelefono("573001234567"),
            ReferenciaExterna = "wamid-duplicado",
            UsuarioId = 1
        });
        await contexto.SaveChangesAsync();

        contexto.Reportes.Add(new Reporte
        {
            Codigo = "RPT-2026-08-16-0101",
            Tipo = TipoReporte.Otro,
            Descripcion = "Segunda llamada con la misma referencia",
            Municipio = "Soacha",
            Canal = CanalOrigen.WhatsApp,
            IdentificadorCanal = IdentificadorCanalReporte.ParaTelefono("573001234567"),
            ReferenciaExterna = "wamid-duplicado",
            UsuarioId = 1
        });

        Exception excepcion = await Record.ExceptionAsync(() => contexto.SaveChangesAsync());
        DbUpdateException dbUpdate = Assert.IsType<DbUpdateException>(excepcion);

        BuscadorReporteIdempotente buscador = new(contexto);
        Assert.True(buscador.EsDuplicadoDeReferenciaExterna(dbUpdate));
    }
}
