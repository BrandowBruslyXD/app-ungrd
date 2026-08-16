using ConectaRiesgoAI.Api.Domain.Entities;
using ConectaRiesgoAI.Api.Domain.Enums;
using ConectaRiesgoAI.Api.Features.Ingesta.CrearReporte;
using ConectaRiesgoAI.Api.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace ConectaRiesgoAI.Api.Tests.Features.Ingesta;

public class CrearReporteIngestaHandlerTests
{
    private static AppDbContext NuevoContexto() => new(
        new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static CrearReporteIngestaHandler NuevoHandler(AppDbContext db) =>
        new(db, NullLogger<CrearReporteIngestaHandler>.Instance);

    private static CrearReporteIngestaCommand Comando(string telefono = "573001234567") =>
        new(telefono, "María R.", "afectacion_propia", TipoReporte.Inundacion,
            "Se inundó la casa por la creciente del río", "Soacha, Villa Mercedes, frente a la cancha",
            "Averiada — NO habitable", "AHE alimentaria", null);

    [Fact]
    public async Task Handle_TelefonoNuevo_CreaUsuarioCiudadanoPorWhatsapp()
    {
        using var db = NuevoContexto();
        var handler = NuevoHandler(db);

        await handler.Handle(Comando(), CancellationToken.None);

        var usuario = await db.Usuarios.SingleAsync();
        Assert.Equal("573001234567", usuario.Telefono);
        Assert.Equal(Rol.Ciudadano, usuario.Rol);
        Assert.Equal(CanalOrigen.WhatsApp, usuario.OrigenRegistro);
    }

    [Fact]
    public async Task Handle_TelefonoNuevo_CreaReporteConCronologiaYCodigo()
    {
        using var db = NuevoContexto();
        var handler = NuevoHandler(db);

        var respuesta = await handler.Handle(Comando(), CancellationToken.None);

        Assert.StartsWith("RPT-", respuesta.Codigo);
        Assert.Equal(EstadoReporte.Reportado, respuesta.Estado);

        var reporte = await db.Reportes.Include(r => r.Cronologia).SingleAsync();
        Assert.Equal(CanalOrigen.WhatsApp, reporte.Canal);
        Assert.Equal(ClaseReporte.AfectacionPropia, reporte.Clase);
        Assert.Single(reporte.Cronologia);
        Assert.Equal(EstadoReporte.Reportado, reporte.Cronologia.Single().Estado);
    }

    [Fact]
    public async Task Handle_TelefonoQueYaTieneUsuario_NoCreaUnUsuarioNuevo()
    {
        using var db = NuevoContexto();
        db.Usuarios.Add(new Usuario
        {
            Nombre = "María R.",
            Email = "whatsapp-573001234567@conectariesgoai.demo",
            PasswordHash = "hash",
            Rol = Rol.Ciudadano,
            Municipio = "Soacha",
            Telefono = "573001234567",
            OrigenRegistro = CanalOrigen.WhatsApp
        });
        await db.SaveChangesAsync();
        var handler = NuevoHandler(db);

        await handler.Handle(Comando(), CancellationToken.None);

        Assert.Equal(1, await db.Usuarios.CountAsync());
        var reporte = await db.Reportes.SingleAsync();
        var usuario = await db.Usuarios.SingleAsync();
        Assert.Equal(usuario.Id, reporte.UsuarioId);
    }

    [Fact]
    public async Task Handle_DosReportesElMismoDia_GeneraCodigosConsecutivosDistintos()
    {
        using var db = NuevoContexto();
        var handler = NuevoHandler(db);

        var primero = await handler.Handle(Comando("573001111111"), CancellationToken.None);
        var segundo = await handler.Handle(Comando("573002222222"), CancellationToken.None);

        Assert.NotEqual(primero.Codigo, segundo.Codigo);
        Assert.Equal(2, await db.Reportes.CountAsync());
    }
}
