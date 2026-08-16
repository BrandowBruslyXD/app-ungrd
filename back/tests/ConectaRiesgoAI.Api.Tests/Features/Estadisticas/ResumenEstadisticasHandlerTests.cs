using ConectaRiesgoAI.Api.Common.Reportes;
using ConectaRiesgoAI.Api.Domain.Entities;
using ConectaRiesgoAI.Api.Domain.Enums;
using ConectaRiesgoAI.Api.Features.Estadisticas.ResumenEstadisticas;
using ConectaRiesgoAI.Api.Tests.Persistence;

namespace ConectaRiesgoAI.Api.Tests.Features.Estadisticas;

public class ResumenEstadisticasHandlerTests
{
    private static Reporte NuevoReporte(
        string codigo, TipoReporte tipo, EstadoReporte estado, string municipio,
        double? lat, double? lng, DateTime creadoEn) => new()
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

    private static ResumenEstadisticasQuery QuerySinFiltros() => new(null, null, null, null);

    [Fact]
    public async Task Handle_SinReportes_DevuelveTodoEnCero()
    {
        using var contexto = AppDbContextPruebas.Crear();
        var handler = new ResumenEstadisticasHandler(contexto);

        var resultado = await handler.Handle(QuerySinFiltros(), CancellationToken.None);

        Assert.Equal(6, resultado.PorTipo.Count);
        Assert.All(Enum.GetValues<TipoReporte>(), tipo => Assert.Equal(0, resultado.PorTipo[tipo.ToString()]));
        Assert.Equal(0, resultado.TotalHoy);
        Assert.Equal(0, resultado.Atendidos);
        Assert.Equal(0, resultado.PorcentajeAtendidos);
        Assert.Equal(0, resultado.TiempoPromedioMinutos);
    }

    [Fact]
    public async Task Handle_ConReportesDeHoyYAtendidos_CalculaTotalYPorcentaje()
    {
        using var contexto = AppDbContextPruebas.Crear();
        var hoy = DateTime.UtcNow;
        contexto.Reportes.AddRange(
            NuevoReporte("RPT-1", TipoReporte.Incendio, EstadoReporte.Atendido, "Bogotá", 4.71, -74.07, hoy),
            NuevoReporte("RPT-2", TipoReporte.Inundacion, EstadoReporte.Cerrado, "Bogotá", 4.71, -74.07, hoy),
            NuevoReporte("RPT-3", TipoReporte.Deslizamiento, EstadoReporte.Reportado, "Bogotá", 4.71, -74.07, hoy));
        await contexto.SaveChangesAsync();
        var handler = new ResumenEstadisticasHandler(contexto);

        var resultado = await handler.Handle(QuerySinFiltros(), CancellationToken.None);

        Assert.Equal(3, resultado.TotalHoy);
        Assert.Equal(2, resultado.Atendidos);
        Assert.Equal(67, resultado.PorcentajeAtendidos);
    }

    [Fact]
    public async Task Handle_ConReportesAtendidos_CalculaTiempoPromedioDesdeCreadoHastaEventoAtendido()
    {
        using var contexto = AppDbContextPruebas.Crear();
        // Ancla al mediodía UTC de hoy para no cruzar la medianoche al restar horas.
        var hoyAlMediodia = DateTime.UtcNow.Date.AddHours(12);
        var creadoEn1 = hoyAlMediodia;
        var reporte1 = NuevoReporte("RPT-1", TipoReporte.Incendio, EstadoReporte.Atendido, "Bogotá", 4.71, -74.07, creadoEn1);
        reporte1.Cronologia.Add(new EventoCronologia
        {
            Estado = EstadoReporte.Atendido,
            Nota = "Atendido",
            Responsable = "Sistema",
            Fecha = creadoEn1.AddMinutes(30)
        });

        var creadoEn2 = hoyAlMediodia.AddHours(1);
        var reporte2 = NuevoReporte("RPT-2", TipoReporte.Inundacion, EstadoReporte.Atendido, "Bogotá", 4.71, -74.07, creadoEn2);
        reporte2.Cronologia.Add(new EventoCronologia
        {
            Estado = EstadoReporte.Atendido,
            Nota = "Atendido",
            Responsable = "Sistema",
            Fecha = creadoEn2.AddMinutes(50)
        });

        contexto.Reportes.AddRange(reporte1, reporte2);
        await contexto.SaveChangesAsync();
        var handler = new ResumenEstadisticasHandler(contexto);

        var resultado = await handler.Handle(QuerySinFiltros(), CancellationToken.None);

        Assert.Equal(40, resultado.TiempoPromedioMinutos);
    }

    [Fact]
    public async Task Handle_ConReportesDeOtrosDias_NoLosCuentaEnTotalHoy()
    {
        using var contexto = AppDbContextPruebas.Crear();
        var ayer = DateTime.UtcNow.AddDays(-1);
        contexto.Reportes.Add(
            NuevoReporte("RPT-AYER", TipoReporte.Incendio, EstadoReporte.Atendido, "Bogotá", 4.71, -74.07, ayer));
        await contexto.SaveChangesAsync();
        var handler = new ResumenEstadisticasHandler(contexto);

        var resultado = await handler.Handle(QuerySinFiltros(), CancellationToken.None);

        Assert.Equal(0, resultado.TotalHoy);
        Assert.Equal(0, resultado.Atendidos);
        Assert.Equal(1, resultado.PorTipo[TipoReporte.Incendio.ToString()]);
    }

    // Handle_FiltraPorMunicipioCaseInsensitive: NO cubierto aquí. El handler filtra con
    // EF.Functions.ILike(r.Municipio, query.Municipio), una función específica de Npgsql que el
    // proveedor InMemory de EF Core no traduce -- al invocar el método real (no traducido) lanza
    // InvalidOperationException. Es el mismo límite por el que ListarReportesHandlerTests, que usa
    // el mismo patrón de filtro, tampoco prueba el filtro de municipio. Verificar este camino
    // requiere una prueba de integración contra Postgres real (o Npgsql InMemory/Testcontainers).

    [Fact]
    public async Task Handle_FiltraPorRadioGeografico_ExcluyeReportesFueraDelRadio()
    {
        using var contexto = AppDbContextPruebas.Crear();
        // Bogotá (centro de búsqueda) y Medellín (~240 km), fuera de un radio de 10 km.
        contexto.Reportes.AddRange(
            NuevoReporte("RPT-CERCA", TipoReporte.Incendio, EstadoReporte.Reportado, "Bogotá",
                4.711, -74.072, DateTime.UtcNow),
            NuevoReporte("RPT-LEJOS", TipoReporte.Incendio, EstadoReporte.Reportado, "Medellín",
                6.244, -75.581, DateTime.UtcNow));
        await contexto.SaveChangesAsync();
        var handler = new ResumenEstadisticasHandler(contexto);

        var resultado = await handler.Handle(
            new ResumenEstadisticasQuery(null, 4.710989, -74.072092, 10), CancellationToken.None);

        Assert.Equal(1, resultado.PorTipo[TipoReporte.Incendio.ToString()]);
        Assert.Equal(1, resultado.TotalHoy);
    }

    [Fact]
    public async Task Handle_PorTipoIncluyeLasSeisLlaves_AunqueAlgunasValganCero()
    {
        using var contexto = AppDbContextPruebas.Crear();
        contexto.Reportes.Add(
            NuevoReporte("RPT-1", TipoReporte.Incendio, EstadoReporte.Reportado, "Bogotá", 4.71, -74.07, DateTime.UtcNow));
        await contexto.SaveChangesAsync();
        var handler = new ResumenEstadisticasHandler(contexto);

        var resultado = await handler.Handle(QuerySinFiltros(), CancellationToken.None);

        Assert.Equal(6, resultado.PorTipo.Count);
        Assert.Equal(1, resultado.PorTipo[TipoReporte.Incendio.ToString()]);
        Assert.Equal(0, resultado.PorTipo[TipoReporte.Inundacion.ToString()]);
        Assert.Equal(0, resultado.PorTipo[TipoReporte.Deslizamiento.ToString()]);
        Assert.Equal(0, resultado.PorTipo[TipoReporte.ViaAfectada.ToString()]);
        Assert.Equal(0, resultado.PorTipo[TipoReporte.ColapsoEstructural.ToString()]);
        Assert.Equal(0, resultado.PorTipo[TipoReporte.Otro.ToString()]);
    }

    [Fact]
    public async Task Handle_ConReporteSinCoordenadas_NoRompeElFiltroGeografico()
    {
        using var contexto = AppDbContextPruebas.Crear();
        var reporteWhatsapp = NuevoReporte("RPT-WHATSAPP", TipoReporte.Incendio, EstadoReporte.Reportado, "Bogotá", null, null, DateTime.UtcNow);
        reporteWhatsapp.Canal = CanalOrigen.WhatsApp;
        reporteWhatsapp.IdentificadorCanal = IdentificadorCanalReporte.ParaTelefono("573001234567");
        contexto.Reportes.Add(reporteWhatsapp);
        await contexto.SaveChangesAsync();
        var handler = new ResumenEstadisticasHandler(contexto);

        var resultado = await handler.Handle(
            new ResumenEstadisticasQuery(null, 4.710989, -74.072092, 10), CancellationToken.None);

        Assert.Equal(0, resultado.PorTipo[TipoReporte.Incendio.ToString()]);
        Assert.Equal(0, resultado.TotalHoy);
    }
}
