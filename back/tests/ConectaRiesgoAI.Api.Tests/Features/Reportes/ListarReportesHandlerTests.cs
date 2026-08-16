using ConectaRiesgoAI.Api.Common.Reportes;
using ConectaRiesgoAI.Api.Domain.Entities;
using ConectaRiesgoAI.Api.Domain.Enums;
using ConectaRiesgoAI.Api.Features.Reportes.ListarReportes;
using ConectaRiesgoAI.Api.Tests.Persistence;

namespace ConectaRiesgoAI.Api.Tests.Features.Reportes;

public class ListarReportesHandlerTests
{
    private static Reporte NuevoReporte(
        string codigo, TipoReporte tipo, EstadoReporte estado, string municipio,
        double lat, double lng, DateTime creadoEn) => new()
    {
        Codigo = codigo,
        Tipo = tipo,
        Estado = estado,
        Descripcion = "Descripción de prueba",
        Municipio = municipio,
        Latitud = lat,
        Longitud = lng,
        IdentificadorCanal = IdentificadorCanalReporte.ParaWeb(1),
        UsuarioId = 1,
        CreadoEn = creadoEn,
        ActualizadoEn = creadoEn
    };

    private static ListarReportesQuery QuerySinFiltros(int? limite = null) =>
        new(null, null, null, null, null, null, limite);

    [Fact]
    public async Task Handle_SinFiltros_DevuelveTodosOrdenadosPorFechaDescendente()
    {
        using var contexto = AppDbContextPruebas.Crear();
        contexto.Reportes.AddRange(
            NuevoReporte("RPT-1", TipoReporte.Incendio, EstadoReporte.Reportado, "Bogotá",
                4.71, -74.07, new DateTime(2026, 8, 14, 10, 0, 0, DateTimeKind.Utc)),
            NuevoReporte("RPT-2", TipoReporte.Inundacion, EstadoReporte.Reportado, "Bogotá",
                4.71, -74.07, new DateTime(2026, 8, 15, 10, 0, 0, DateTimeKind.Utc)));
        await contexto.SaveChangesAsync();
        var handler = new ListarReportesHandler(contexto);

        var resultado = await handler.Handle(QuerySinFiltros(), CancellationToken.None);

        Assert.Equal(["RPT-2", "RPT-1"], resultado.Select(r => r.Codigo));
    }

    [Fact]
    public async Task Handle_FiltraPorTipo_SoloDevuelveLosQueCoinciden()
    {
        using var contexto = AppDbContextPruebas.Crear();
        contexto.Reportes.AddRange(
            NuevoReporte("RPT-1", TipoReporte.Incendio, EstadoReporte.Reportado, "Bogotá", 4.71, -74.07, DateTime.UtcNow),
            NuevoReporte("RPT-2", TipoReporte.Inundacion, EstadoReporte.Reportado, "Bogotá", 4.71, -74.07, DateTime.UtcNow));
        await contexto.SaveChangesAsync();
        var handler = new ListarReportesHandler(contexto);

        var resultado = await handler.Handle(
            new ListarReportesQuery(TipoReporte.Incendio, null, null, null, null, null, null), CancellationToken.None);

        var reporte = Assert.Single(resultado);
        Assert.Equal("RPT-1", reporte.Codigo);
    }

    [Fact]
    public async Task Handle_ConRadioKm_ExcluyeLosReportesFueraDelRadio()
    {
        using var contexto = AppDbContextPruebas.Crear();
        // Bogotá (centro de búsqueda) y Medellín (~240 km), fuera de un radio de 10 km.
        contexto.Reportes.AddRange(
            NuevoReporte("RPT-CERCA", TipoReporte.Incendio, EstadoReporte.Reportado, "Bogotá",
                4.711, -74.072, DateTime.UtcNow),
            NuevoReporte("RPT-LEJOS", TipoReporte.Incendio, EstadoReporte.Reportado, "Medellín",
                6.244, -75.581, DateTime.UtcNow));
        await contexto.SaveChangesAsync();
        var handler = new ListarReportesHandler(contexto);

        var resultado = await handler.Handle(
            new ListarReportesQuery(null, null, 4.710989, -74.072092, 10, null, null), CancellationToken.None);

        var reporte = Assert.Single(resultado);
        Assert.Equal("RPT-CERCA", reporte.Codigo);
        Assert.NotNull(reporte.DistanciaKm);
        Assert.True(reporte.DistanciaKm < 10);
    }

    [Fact]
    public async Task Handle_SinLatNiLng_DistanciaKmLlegaNula()
    {
        using var contexto = AppDbContextPruebas.Crear();
        contexto.Reportes.Add(NuevoReporte("RPT-1", TipoReporte.Incendio, EstadoReporte.Reportado, "Bogotá",
            4.71, -74.07, DateTime.UtcNow));
        await contexto.SaveChangesAsync();
        var handler = new ListarReportesHandler(contexto);

        var resultado = await handler.Handle(QuerySinFiltros(), CancellationToken.None);

        Assert.Null(Assert.Single(resultado).DistanciaKm);
    }

    [Fact]
    public async Task Handle_ConLimite_RecortaElResultado()
    {
        using var contexto = AppDbContextPruebas.Crear();
        contexto.Reportes.AddRange(
            NuevoReporte("RPT-1", TipoReporte.Incendio, EstadoReporte.Reportado, "Bogotá",
                4.71, -74.07, DateTime.UtcNow.AddMinutes(-2)),
            NuevoReporte("RPT-2", TipoReporte.Incendio, EstadoReporte.Reportado, "Bogotá",
                4.71, -74.07, DateTime.UtcNow.AddMinutes(-1)),
            NuevoReporte("RPT-3", TipoReporte.Incendio, EstadoReporte.Reportado, "Bogotá",
                4.71, -74.07, DateTime.UtcNow));
        await contexto.SaveChangesAsync();
        var handler = new ListarReportesHandler(contexto);

        var resultado = await handler.Handle(QuerySinFiltros(limite: 2), CancellationToken.None);

        Assert.Equal(2, resultado.Count);
    }
}
