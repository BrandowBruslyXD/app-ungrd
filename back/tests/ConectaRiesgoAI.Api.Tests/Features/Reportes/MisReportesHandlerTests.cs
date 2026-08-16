using ConectaRiesgoAI.Api.Common.Reportes;
using ConectaRiesgoAI.Api.Domain.Entities;
using ConectaRiesgoAI.Api.Domain.Enums;
using ConectaRiesgoAI.Api.Features.Reportes.MisReportes;
using ConectaRiesgoAI.Api.Tests.Persistence;

namespace ConectaRiesgoAI.Api.Tests.Features.Reportes;

public class MisReportesHandlerTests
{
    private static Reporte NuevoReporte(string codigo, int usuarioId, DateTime creadoEn) => new()
    {
        Codigo = codigo,
        Tipo = TipoReporte.Incendio,
        Descripcion = "Descripción de prueba",
        Municipio = "Bogotá",
        Latitud = 4.71,
        Longitud = -74.07,
        IdentificadorCanal = IdentificadorCanalReporte.ParaWeb(usuarioId),
        UsuarioId = usuarioId,
        CreadoEn = creadoEn,
        ActualizadoEn = creadoEn
    };

    [Fact]
    public async Task Handle_DevuelveSoloLosReportesDelUsuarioDelToken()
    {
        using var contexto = AppDbContextPruebas.Crear();
        contexto.Reportes.AddRange(
            NuevoReporte("RPT-MIO", 1, DateTime.UtcNow),
            NuevoReporte("RPT-AJENO", 2, DateTime.UtcNow));
        await contexto.SaveChangesAsync();
        var handler = new MisReportesHandler(contexto);

        var resultado = await handler.Handle(new MisReportesQuery(1), CancellationToken.None);

        var reporte = Assert.Single(resultado);
        Assert.Equal("RPT-MIO", reporte.Codigo);
    }

    [Fact]
    public async Task Handle_UsuarioSinReportes_DevuelveListaVacia()
    {
        using var contexto = AppDbContextPruebas.Crear();
        var handler = new MisReportesHandler(contexto);

        var resultado = await handler.Handle(new MisReportesQuery(99), CancellationToken.None);

        Assert.Empty(resultado);
    }

    [Fact]
    public async Task Handle_VariosReportesDelUsuario_OrdenaPorFechaDescendente()
    {
        using var contexto = AppDbContextPruebas.Crear();
        contexto.Reportes.AddRange(
            NuevoReporte("RPT-VIEJO", 1, DateTime.UtcNow.AddDays(-1)),
            NuevoReporte("RPT-NUEVO", 1, DateTime.UtcNow));
        await contexto.SaveChangesAsync();
        var handler = new MisReportesHandler(contexto);

        var resultado = await handler.Handle(new MisReportesQuery(1), CancellationToken.None);

        Assert.Equal(["RPT-NUEVO", "RPT-VIEJO"], resultado.Select(r => r.Codigo));
    }
}
