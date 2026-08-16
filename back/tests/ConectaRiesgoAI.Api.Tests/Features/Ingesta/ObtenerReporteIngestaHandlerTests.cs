using ConectaRiesgoAI.Api.Domain.Entities;
using ConectaRiesgoAI.Api.Domain.Enums;
using ConectaRiesgoAI.Api.Common.Reportes;
using ConectaRiesgoAI.Api.Features.Ingesta.ObtenerReporte;
using ConectaRiesgoAI.Api.Tests.Persistence;

namespace ConectaRiesgoAI.Api.Tests.Features.Ingesta;

public class ObtenerReporteIngestaHandlerTests
{
    private static Usuario NuevoUsuario(int id) => new()
    {
        Id = id,
        Nombre = "María R.",
        Email = $"usuario{id}@conectariesgoai.demo",
        PasswordHash = "hash",
        Rol = Rol.Ciudadano,
        Municipio = "Soacha"
    };

    private static Reporte NuevoReporte(string codigo, int usuarioId) => new()
    {
        Codigo = codigo,
        Tipo = TipoReporte.Inundacion,
        Descripcion = "Se inundó la casa por la creciente del río",
        Municipio = "Soacha",
        UbicacionTexto = "Soacha, Villa Mercedes, frente a la cancha",
        Canal = CanalOrigen.WhatsApp,
        IdentificadorCanal = IdentificadorCanalReporte.ParaTelefono("573001234567"),
        UsuarioId = usuarioId,
        Estado = EstadoReporte.EnAtencion,
        ActualizadoEn = new DateTime(2026, 8, 16, 15, 30, 0, DateTimeKind.Utc)
    };

    [Fact]
    public async Task Handle_ReporteConTresEventos_DevuelveEstadoActualizadoYDetalleConLosTresEventos()
    {
        using var contexto = AppDbContextPruebas.Crear();
        contexto.Usuarios.Add(NuevoUsuario(1));
        var reporte = NuevoReporte("RPT-2026-08-16-0001", 1);
        reporte.Cronologia.Add(new EventoCronologia
        {
            Estado = EstadoReporte.Reportado,
            Nota = "Reporte recibido por WhatsApp",
            Responsable = "Sistema",
            Fecha = new DateTime(2026, 8, 16, 14, 30, 0, DateTimeKind.Utc)
        });
        reporte.Cronologia.Add(new EventoCronologia
        {
            Estado = EstadoReporte.Verificado,
            Nota = "Confirmado por datos satelitales",
            Responsable = "Sistema",
            Fecha = new DateTime(2026, 8, 16, 14, 40, 0, DateTimeKind.Utc)
        });
        reporte.Cronologia.Add(new EventoCronologia
        {
            Estado = EstadoReporte.Asignado,
            Nota = "Brigada asignada",
            Responsable = "Gestor",
            Fecha = new DateTime(2026, 8, 16, 15, 0, 0, DateTimeKind.Utc)
        });
        contexto.Reportes.Add(reporte);
        await contexto.SaveChangesAsync();
        var handler = new ObtenerReporteIngestaHandler(contexto);

        var respuesta = await handler.Handle(
            new ObtenerReporteIngestaQuery("RPT-2026-08-16-0001"), CancellationToken.None);

        Assert.Equal("RPT-2026-08-16-0001", respuesta.Codigo);
        Assert.Equal("EnAtencion", respuesta.Estado);
        Assert.Equal("15:30 del 16/8", respuesta.Actualizado);
        Assert.Contains("• Reportado — 14:30 del 16/8", respuesta.Detalle);
        Assert.Contains("• Verificado — 14:40 del 16/8", respuesta.Detalle);
        Assert.Contains("• Asignado — 15:00 del 16/8", respuesta.Detalle);
        Assert.Contains("*Cronología:*", respuesta.Detalle);
        Assert.DoesNotContain("**", respuesta.Detalle);
    }

    [Fact]
    public async Task Handle_ReporteConUbicacionTexto_LaIncluyeComoPrimeraLineaDelDetalle()
    {
        using var contexto = AppDbContextPruebas.Crear();
        contexto.Usuarios.Add(NuevoUsuario(1));
        contexto.Reportes.Add(NuevoReporte("RPT-2026-08-16-0002", 1));
        await contexto.SaveChangesAsync();
        var handler = new ObtenerReporteIngestaHandler(contexto);

        var respuesta = await handler.Handle(
            new ObtenerReporteIngestaQuery("RPT-2026-08-16-0002"), CancellationToken.None);

        Assert.StartsWith("📍 Soacha, Villa Mercedes, frente a la cancha", respuesta.Detalle);
    }

    [Fact]
    public async Task Handle_CodigoInexistente_DevuelveEstadoNoEncontradoSinLanzarExcepcion()
    {
        using var contexto = AppDbContextPruebas.Crear();
        var handler = new ObtenerReporteIngestaHandler(contexto);

        var respuesta = await handler.Handle(
            new ObtenerReporteIngestaQuery("RPT-NO-EXISTE"), CancellationToken.None);

        Assert.Equal("No encontrado", respuesta.Estado);
        Assert.Equal("—", respuesta.Actualizado);
        Assert.NotEmpty(respuesta.Detalle);
    }
}
