using ConectaRiesgoAI.Api.Common.Auth;
using ConectaRiesgoAI.Api.Domain.Entities;
using ConectaRiesgoAI.Api.Domain.Enums;
using ConectaRiesgoAI.Api.Features.Reportes.ActualizarEstado;
using ConectaRiesgoAI.Api.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace ConectaRiesgoAI.Api.Tests.Features.Reportes;

public class ActualizarEstadoHandlerTests
{
    private sealed class UsuarioActualFalso(string? nombre) : IUsuarioActual
    {
        public int? Id => 1;
        public string? Nombre => nombre;
        public Rol? Rol => Domain.Enums.Rol.Gestor;
        public bool EstaAutenticado => true;
    }

    private static AppDbContext NuevoContexto() => new(
        new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static ActualizarEstadoHandler NuevoHandler(AppDbContext db, string? nombreGestor = "Carlos M.") =>
        new(db, new UsuarioActualFalso(nombreGestor), NullLogger<ActualizarEstadoHandler>.Instance);

    private static async Task<Reporte> NuevoReporteAsync(AppDbContext db)
    {
        Usuario usuario = new()
        {
            Nombre = "María Rodríguez",
            Email = "maria@ejemplo.com",
            PasswordHash = "hash",
            Rol = Rol.Ciudadano,
            Municipio = "Bogotá"
        };
        db.Usuarios.Add(usuario);

        Reporte reporte = new()
        {
            Codigo = "RPT-2026-08-15-0047",
            Tipo = TipoReporte.Inundacion,
            Descripcion = "Se está inundando la vía principal",
            Municipio = "Bogotá",
            Latitud = 4.710989,
            Longitud = -74.072092,
            Usuario = usuario
        };
        db.Reportes.Add(reporte);
        await db.SaveChangesAsync();

        return reporte;
    }

    [Fact]
    public async Task Handle_TransicionValida_ActualizaEstadoYRegistraEnCronologia()
    {
        using var db = NuevoContexto();
        var reporte = await NuevoReporteAsync(db);
        var handler = NuevoHandler(db);
        var comando = new ActualizarEstadoCommand(reporte.Codigo, EstadoReporte.EnAtencion, "Brigada en camino");

        var respuesta = await handler.Handle(comando, CancellationToken.None);

        Assert.Equal(reporte.Codigo, respuesta.Codigo);
        Assert.Equal(EstadoReporte.EnAtencion, respuesta.Estado);

        var reporteActualizado = await db.Reportes.SingleAsync(r => r.Codigo == reporte.Codigo);
        Assert.Equal(EstadoReporte.EnAtencion, reporteActualizado.Estado);

        var evento = await db.EventosCronologia.SingleAsync(e => e.ReporteId == reporteActualizado.Id);
        Assert.Equal(EstadoReporte.EnAtencion, evento.Estado);
        Assert.Equal("Brigada en camino", evento.Nota);
        Assert.Equal("Carlos M.", evento.Responsable);
    }

    [Fact]
    public async Task Handle_ReporteNoExiste_LanzaKeyNotFoundException()
    {
        using var db = NuevoContexto();
        var handler = NuevoHandler(db);
        var comando = new ActualizarEstadoCommand("RPT-2026-08-15-9999", EstadoReporte.Verificado, "No existe");

        await Assert.ThrowsAsync<KeyNotFoundException>(() => handler.Handle(comando, CancellationToken.None));
    }

    [Fact]
    public async Task Handle_TransicionHaciaAtras_LanzaInvalidOperationException()
    {
        using var db = NuevoContexto();
        var reporte = await NuevoReporteAsync(db);
        var handler = NuevoHandler(db);
        await handler.Handle(new ActualizarEstadoCommand(reporte.Codigo, EstadoReporte.Asignado, "Asignado"), CancellationToken.None);

        var comando = new ActualizarEstadoCommand(reporte.Codigo, EstadoReporte.Verificado, "Intento inválido");

        await Assert.ThrowsAsync<InvalidOperationException>(() => handler.Handle(comando, CancellationToken.None));
    }

    [Fact]
    public async Task Handle_UsuarioActualSinNombre_UsaSistemaComoResponsable()
    {
        using var db = NuevoContexto();
        var reporte = await NuevoReporteAsync(db);
        var handler = NuevoHandler(db, nombreGestor: null);
        var comando = new ActualizarEstadoCommand(reporte.Codigo, EstadoReporte.Verificado, "Confirmado");

        await handler.Handle(comando, CancellationToken.None);

        var evento = await db.EventosCronologia.SingleAsync();
        Assert.Equal("Sistema", evento.Responsable);
    }
}
