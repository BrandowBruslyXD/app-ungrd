using ConectaRiesgoAI.Api.Domain.Entities;
using ConectaRiesgoAI.Api.Domain.Enums;
using ConectaRiesgoAI.Api.Features.Reportes.CrearReporte;
using ConectaRiesgoAI.Api.Tests.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ConectaRiesgoAI.Api.Tests.Features.Reportes;

public class CrearReporteHandlerTests
{
    private static CrearReporteCommand NuevoComando(int usuarioId = 1) => new(
        TipoReporte.Inundacion,
        "Se está inundando la vía principal",
        4.710989,
        -74.072092,
        "Calle 123 #45-67",
        "Bogotá",
        null,
        usuarioId);

    [Fact]
    public async Task Handle_ReporteValido_DevuelveCodigoDelDiaConEstadoReportado()
    {
        using var contexto = AppDbContextPruebas.Crear();
        var handler = new CrearReporteHandler(contexto);

        var respuesta = await handler.Handle(NuevoComando(), CancellationToken.None);

        var hoy = DateTime.UtcNow.ToString("yyyy-MM-dd");
        Assert.Equal($"RPT-{hoy}-0001", respuesta.Codigo);
        Assert.Equal(EstadoReporte.Reportado, respuesta.Estado);
    }

    [Fact]
    public async Task Handle_ReporteValido_RegistraElPrimerEventoDeCronologia()
    {
        using var contexto = AppDbContextPruebas.Crear();
        var handler = new CrearReporteHandler(contexto);

        var respuesta = await handler.Handle(NuevoComando(), CancellationToken.None);

        var reporte = await contexto.Reportes
            .Include(r => r.Cronologia)
            .SingleAsync(r => r.Codigo == respuesta.Codigo);
        var evento = Assert.Single(reporte.Cronologia);
        Assert.Equal(EstadoReporte.Reportado, evento.Estado);
        Assert.Equal("Sistema", evento.Responsable);
    }

    [Fact]
    public async Task Handle_UsuarioIdDelComando_QuedaAsociadoAlReporte()
    {
        using var contexto = AppDbContextPruebas.Crear();
        var handler = new CrearReporteHandler(contexto);

        var respuesta = await handler.Handle(NuevoComando(usuarioId: 7), CancellationToken.None);

        var reporte = await contexto.Reportes.SingleAsync(r => r.Codigo == respuesta.Codigo);
        Assert.Equal(7, reporte.UsuarioId);
    }

    [Fact]
    public async Task Handle_DosReportesElMismoDia_IncrementaElConsecutivo()
    {
        using var contexto = AppDbContextPruebas.Crear();
        var handler = new CrearReporteHandler(contexto);

        await handler.Handle(NuevoComando(), CancellationToken.None);
        var segunda = await handler.Handle(NuevoComando(), CancellationToken.None);

        var hoy = DateTime.UtcNow.ToString("yyyy-MM-dd");
        Assert.Equal($"RPT-{hoy}-0002", segunda.Codigo);
    }

    /// <summary>
    /// Reproduce, sin concurrencia real, el estado en el que dos peticiones casi simultáneas
    /// dejan la base: ya existe un reporte ocupando el consecutivo que el próximo COUNT+1 volvería
    /// a calcular. El proveedor InMemory no aplica índices únicos (por eso no atrapaba este caso);
    /// aquí se usa SQLite, que sí lo hace, para verificar que el handler reintenta con otro
    /// consecutivo en vez de devolver 500 y perder el reporte de la emergencia.
    /// </summary>
    [Fact]
    public async Task Handle_ConElConsecutivoNaturalYaOcupado_ReintentaConOtroCodigoEnVezDeFallar()
    {
        var (contexto, conexion) = AppDbContextSqlitePruebas.Crear();
        using var contextoDesechable = contexto;
        using var conexionDesechable = conexion;

        var hoy = DateTime.UtcNow;
        contexto.Reportes.Add(new Reporte
        {
            Codigo = Reporte.GenerarCodigo(hoy, 2),
            Tipo = TipoReporte.Incendio,
            Descripcion = "Reporte que ya ocupa el consecutivo 2",
            Municipio = "Bogotá",
            Latitud = 4.71,
            Longitud = -74.07,
            UsuarioId = 1,
            CreadoEn = hoy
        });
        await contexto.SaveChangesAsync();

        var handler = new CrearReporteHandler(contexto);
        var respuesta = await handler.Handle(NuevoComando(), CancellationToken.None);

        Assert.Equal($"RPT-{hoy:yyyy-MM-dd}-0003", respuesta.Codigo);
    }
}
