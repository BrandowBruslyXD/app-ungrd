using ConectaRiesgoAI.Api.Domain.Entities;
using ConectaRiesgoAI.Api.Domain.Enums;
using ConectaRiesgoAI.Api.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ConectaRiesgoAI.Api.Tests.Features.Reportes;

public class ReporteCamposWhatsappTests
{
    private static AppDbContext NuevoContexto() => new(
        new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static Usuario NuevoUsuario(string? telefono = null) => new()
    {
        Nombre = "María Rodríguez",
        Email = $"{Guid.NewGuid()}@ejemplo.com",
        PasswordHash = "hash",
        Municipio = "Soacha",
        Telefono = telefono
    };

    [Fact]
    public async Task Guardar_ReporteSinCoordenadas_SePersisteConCanalWhatsapp()
    {
        using var db = NuevoContexto();
        var usuario = NuevoUsuario("573001234567");
        db.Usuarios.Add(usuario);
        await db.SaveChangesAsync();

        var reporte = new Reporte
        {
            Codigo = "RPT-2026-08-16-0001",
            Tipo = TipoReporte.Inundacion,
            Descripcion = "Se inundó la casa por la creciente del río",
            Municipio = "Soacha",
            UbicacionTexto = "Soacha, Villa Mercedes, frente a la cancha",
            Canal = CanalOrigen.WhatsApp,
            Confianza = ConfianzaReporte.Autorreportado,
            Usuario = usuario
        };
        db.Reportes.Add(reporte);
        await db.SaveChangesAsync();

        var guardado = await db.Reportes.SingleAsync();
        Assert.Null(guardado.Latitud);
        Assert.Null(guardado.Longitud);
        Assert.Equal(CanalOrigen.WhatsApp, guardado.Canal);
        Assert.Equal(ConfianzaReporte.Autorreportado, guardado.Confianza);
        Assert.Equal("Soacha, Villa Mercedes, frente a la cancha", guardado.UbicacionTexto);
    }

    [Fact]
    public async Task Guardar_ReporteDesdeLaWeb_MantieneCanalWebYCoordenadas()
    {
        using var db = NuevoContexto();
        var usuario = NuevoUsuario();
        db.Usuarios.Add(usuario);
        await db.SaveChangesAsync();

        var reporte = new Reporte
        {
            Codigo = "RPT-2026-08-16-0002",
            Tipo = TipoReporte.Incendio,
            Descripcion = "Incendio forestal cerca a la vía",
            Municipio = "Bogotá",
            Latitud = 4.710989,
            Longitud = -74.072092,
            Usuario = usuario
        };
        db.Reportes.Add(reporte);
        await db.SaveChangesAsync();

        var guardado = await db.Reportes.SingleAsync();
        Assert.Equal(CanalOrigen.Web, guardado.Canal);
        Assert.Equal(4.710989, guardado.Latitud);
        Assert.Equal(-74.072092, guardado.Longitud);
    }

    [Fact]
    public void ElIndiceDeTelefonoEsUnico()
    {
        using var db = NuevoContexto();

        var indice = db.Model.FindEntityType(typeof(Usuario))!
            .GetIndexes()
            .Single(i => i.Properties.Single().Name == nameof(Usuario.Telefono));

        Assert.True(indice.IsUnique);
    }
}
