using ConectaRiesgoAI.Api.Common.Reportes;
using ConectaRiesgoAI.Api.Domain.Entities;
using ConectaRiesgoAI.Api.Domain.Enums;
using ConectaRiesgoAI.Api.Features.Reportes.ObtenerReporte;
using ConectaRiesgoAI.Api.Integrations.Nasa;
using ConectaRiesgoAI.Api.Integrations.Secop;
using ConectaRiesgoAI.Api.Tests.Integrations.Nasa;
using ConectaRiesgoAI.Api.Tests.Integrations.Secop;
using ConectaRiesgoAI.Api.Tests.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ConectaRiesgoAI.Api.Tests.Features.Reportes;

public class ObtenerReporteHandlerTests
{
    private static Usuario NuevoUsuario(int id, string nombre) => new()
    {
        Id = id,
        Nombre = nombre,
        Email = $"usuario{id}@conectariesgoai.demo",
        PasswordHash = "hash",
        Rol = Rol.Ciudadano,
        Municipio = "Bogotá"
    };

    private static Reporte NuevoReporte(string codigo, int usuarioId) => new()
    {
        Codigo = codigo,
        Tipo = TipoReporte.Inundacion,
        Descripcion = "Descripción de prueba",
        Municipio = "Bogotá",
        Latitud = 4.71,
        Longitud = -74.07,
        IdentificadorCanal = IdentificadorCanalReporte.ParaWeb(usuarioId),
        UsuarioId = usuarioId
    };

    [Fact]
    public async Task Handle_ReporteExistente_DevuelveCronologiaOrdenadaPorFecha()
    {
        using var contexto = AppDbContextPruebas.Crear();
        contexto.Usuarios.Add(NuevoUsuario(1, "Ana Ciudadana"));
        var reporte = NuevoReporte("RPT-2026-08-15-0001", 1);
        reporte.Cronologia.Add(new EventoCronologia
        {
            Estado = EstadoReporte.Verificado,
            Nota = "Confirmado",
            Responsable = "Sistema",
            Fecha = new DateTime(2026, 8, 15, 15, 0, 0, DateTimeKind.Utc)
        });
        reporte.Cronologia.Add(new EventoCronologia
        {
            Estado = EstadoReporte.Reportado,
            Nota = "Reporte recibido",
            Responsable = "Sistema",
            Fecha = new DateTime(2026, 8, 15, 14, 0, 0, DateTimeKind.Utc)
        });
        contexto.Reportes.Add(reporte);
        await contexto.SaveChangesAsync();
        var handler = new ObtenerReporteHandler(contexto, new SecopClientFalso(), new NasaFirmsClientFalso());

        var respuesta = await handler.Handle(new ObtenerReporteQuery("RPT-2026-08-15-0001"), CancellationToken.None);

        Assert.Equal(
            [EstadoReporte.Reportado, EstadoReporte.Verificado],
            respuesta.Cronologia.Select(e => e.Estado));
    }

    [Fact]
    public async Task Handle_CodigoInexistente_LanzaKeyNotFoundException()
    {
        using var contexto = AppDbContextPruebas.Crear();
        var handler = new ObtenerReporteHandler(contexto, new SecopClientFalso(), new NasaFirmsClientFalso());

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => handler.Handle(new ObtenerReporteQuery("RPT-NO-EXISTE"), CancellationToken.None));
    }

    [Fact]
    public async Task Handle_UsuarioConNombreYApellido_AbreviaElApellidoParaProtegerLaPrivacidad()
    {
        using var contexto = AppDbContextPruebas.Crear();
        contexto.Usuarios.Add(NuevoUsuario(1, "María Rodríguez"));
        contexto.Reportes.Add(NuevoReporte("RPT-2026-08-15-0002", 1));
        await contexto.SaveChangesAsync();
        var handler = new ObtenerReporteHandler(contexto, new SecopClientFalso(), new NasaFirmsClientFalso());

        var respuesta = await handler.Handle(new ObtenerReporteQuery("RPT-2026-08-15-0002"), CancellationToken.None);

        Assert.Equal("María R.", respuesta.ReportadoPor);
    }

    [Fact]
    public async Task Handle_SinVerificacionSatelital_DevuelveNullYTransparenciaVacia()
    {
        using var contexto = AppDbContextPruebas.Crear();
        contexto.Usuarios.Add(NuevoUsuario(1, "Ana Ciudadana"));
        contexto.Reportes.Add(NuevoReporte("RPT-2026-08-15-0003", 1));
        await contexto.SaveChangesAsync();
        var handler = new ObtenerReporteHandler(contexto, new SecopClientFalso(), new NasaFirmsClientFalso());

        var respuesta = await handler.Handle(new ObtenerReporteQuery("RPT-2026-08-15-0003"), CancellationToken.None);

        Assert.Null(respuesta.VerificacionSatelital);
        Assert.Empty(respuesta.Transparencia);
    }

    [Fact]
    public async Task Handle_ConVariasVerificaciones_DevuelveLaMasReciente()
    {
        using var contexto = AppDbContextPruebas.Crear();
        contexto.Usuarios.Add(NuevoUsuario(1, "Ana Ciudadana"));
        var reporte = NuevoReporte("RPT-2026-08-15-0004", 1);
        reporte.VerificacionesSatelitales.Add(new VerificacionSatelital
        {
            Fuente = "NASA FIRMS",
            Confirmado = false,
            Detalle = "Antigua",
            ConsultadoEn = new DateTime(2026, 8, 15, 10, 0, 0, DateTimeKind.Utc)
        });
        reporte.VerificacionesSatelitales.Add(new VerificacionSatelital
        {
            Fuente = "NASA FIRMS",
            Confirmado = true,
            Detalle = "Reciente",
            ConsultadoEn = new DateTime(2026, 8, 15, 12, 0, 0, DateTimeKind.Utc)
        });
        contexto.Reportes.Add(reporte);
        await contexto.SaveChangesAsync();
        var handler = new ObtenerReporteHandler(contexto, new SecopClientFalso(), new NasaFirmsClientFalso());

        var respuesta = await handler.Handle(new ObtenerReporteQuery("RPT-2026-08-15-0004"), CancellationToken.None);

        Assert.NotNull(respuesta.VerificacionSatelital);
        Assert.Equal("Reciente", respuesta.VerificacionSatelital!.Detalle);
    }

    [Fact]
    public async Task Handle_SecopDevuelveContratos_LosMapeaAlBloqueDeTransparencia()
    {
        using var contexto = AppDbContextPruebas.Crear();
        contexto.Usuarios.Add(NuevoUsuario(1, "Ana Ciudadana"));
        contexto.Reportes.Add(NuevoReporte("RPT-2026-08-15-0005", 1));
        await contexto.SaveChangesAsync();
        var secopClient = new SecopClientFalso([new ContratoSecop("Obra de canalización", 450_000_000m, 2024, "Alcaldía de Bogotá")]);
        var handler = new ObtenerReporteHandler(contexto, secopClient, new NasaFirmsClientFalso());

        var respuesta = await handler.Handle(new ObtenerReporteQuery("RPT-2026-08-15-0005"), CancellationToken.None);

        var item = Assert.Single(respuesta.Transparencia);
        Assert.Equal("Obra de canalización", item.Objeto);
        Assert.Equal("Bogotá", secopClient.UltimoMunicipioConsultado);
    }

    [Fact]
    public async Task Handle_SecopSinDatosParaElMunicipio_DevuelveTransparenciaVaciaSinRomperElReporte()
    {
        using var contexto = AppDbContextPruebas.Crear();
        contexto.Usuarios.Add(NuevoUsuario(1, "Ana Ciudadana"));
        contexto.Reportes.Add(NuevoReporte("RPT-2026-08-15-0006", 1));
        await contexto.SaveChangesAsync();
        var handler = new ObtenerReporteHandler(contexto, new SecopClientFalso(), new NasaFirmsClientFalso());

        var respuesta = await handler.Handle(new ObtenerReporteQuery("RPT-2026-08-15-0006"), CancellationToken.None);

        Assert.Equal("RPT-2026-08-15-0006", respuesta.Codigo);
        Assert.Empty(respuesta.Transparencia);
    }

    [Fact]
    public async Task Handle_IncendioConCoordenadasYSinVerificacionPrevia_ConsultaNasaYPersisteElResultado()
    {
        using var contexto = AppDbContextPruebas.Crear();
        contexto.Usuarios.Add(NuevoUsuario(1, "Ana Ciudadana"));
        var reporte = NuevoReporte("RPT-2026-08-15-0007", 1);
        reporte.Tipo = TipoReporte.Incendio;
        contexto.Reportes.Add(reporte);
        await contexto.SaveChangesAsync();
        var resultado = new ResultadoVerificacionSatelital(true, 3, 2.1, "3 focos de calor detectados a menos de 5 km");
        var nasaFirmsClient = new NasaFirmsClientFalso(resultado);
        var handler = new ObtenerReporteHandler(contexto, new SecopClientFalso(), nasaFirmsClient);

        var respuesta = await handler.Handle(new ObtenerReporteQuery("RPT-2026-08-15-0007"), CancellationToken.None);

        Assert.NotNull(respuesta.VerificacionSatelital);
        Assert.True(respuesta.VerificacionSatelital!.Confirmado);
        Assert.Equal("3 focos de calor detectados a menos de 5 km", respuesta.VerificacionSatelital.Detalle);
        Assert.Equal(1, nasaFirmsClient.VecesLlamado);
        Assert.Single(await contexto.VerificacionesSatelitales.ToListAsync());
    }

    [Fact]
    public async Task Handle_IncendioConVerificacionYaPersistida_NoVuelveAConsultarNasa()
    {
        using var contexto = AppDbContextPruebas.Crear();
        contexto.Usuarios.Add(NuevoUsuario(1, "Ana Ciudadana"));
        var reporte = NuevoReporte("RPT-2026-08-15-0008", 1);
        reporte.Tipo = TipoReporte.Incendio;
        reporte.VerificacionesSatelitales.Add(new VerificacionSatelital
        {
            Fuente = "NASA FIRMS",
            Confirmado = true,
            Detalle = "Ya verificado antes",
            ConsultadoEn = new DateTime(2026, 8, 15, 10, 0, 0, DateTimeKind.Utc)
        });
        contexto.Reportes.Add(reporte);
        await contexto.SaveChangesAsync();
        var nasaFirmsClient = new NasaFirmsClientFalso();
        var handler = new ObtenerReporteHandler(contexto, new SecopClientFalso(), nasaFirmsClient);

        var respuesta = await handler.Handle(new ObtenerReporteQuery("RPT-2026-08-15-0008"), CancellationToken.None);

        Assert.Equal("Ya verificado antes", respuesta.VerificacionSatelital!.Detalle);
        Assert.Equal(0, nasaFirmsClient.VecesLlamado);
    }

    [Fact]
    public async Task Handle_ReporteDeInundacion_NuncaConsultaNasa()
    {
        using var contexto = AppDbContextPruebas.Crear();
        contexto.Usuarios.Add(NuevoUsuario(1, "Ana Ciudadana"));
        contexto.Reportes.Add(NuevoReporte("RPT-2026-08-15-0009", 1)); // Tipo por defecto: Inundacion
        await contexto.SaveChangesAsync();
        var nasaFirmsClient = new NasaFirmsClientFalso(new ResultadoVerificacionSatelital(true, 1, 1, "no debería usarse"));
        var handler = new ObtenerReporteHandler(contexto, new SecopClientFalso(), nasaFirmsClient);

        var respuesta = await handler.Handle(new ObtenerReporteQuery("RPT-2026-08-15-0009"), CancellationToken.None);

        Assert.Null(respuesta.VerificacionSatelital);
        Assert.Equal(0, nasaFirmsClient.VecesLlamado);
    }

    [Fact]
    public async Task Handle_IncendioSinCoordenadas_NoConsultaNasa()
    {
        using var contexto = AppDbContextPruebas.Crear();
        contexto.Usuarios.Add(NuevoUsuario(1, "Ana Ciudadana"));
        var reporte = NuevoReporte("RPT-2026-08-15-0010", 1);
        reporte.Tipo = TipoReporte.Incendio;
        reporte.Latitud = null;
        reporte.Longitud = null;
        contexto.Reportes.Add(reporte);
        await contexto.SaveChangesAsync();
        var nasaFirmsClient = new NasaFirmsClientFalso(new ResultadoVerificacionSatelital(true, 1, 1, "no debería usarse"));
        var handler = new ObtenerReporteHandler(contexto, new SecopClientFalso(), nasaFirmsClient);

        var respuesta = await handler.Handle(new ObtenerReporteQuery("RPT-2026-08-15-0010"), CancellationToken.None);

        Assert.Null(respuesta.VerificacionSatelital);
        Assert.Equal(0, nasaFirmsClient.VecesLlamado);
    }

    [Fact]
    public async Task Handle_IncendioYNasaFirmsSinResultado_DevuelveVerificacionNulaSinPersistirNada()
    {
        using var contexto = AppDbContextPruebas.Crear();
        contexto.Usuarios.Add(NuevoUsuario(1, "Ana Ciudadana"));
        var reporte = NuevoReporte("RPT-2026-08-15-0011", 1);
        reporte.Tipo = TipoReporte.Incendio;
        contexto.Reportes.Add(reporte);
        await contexto.SaveChangesAsync();
        var handler = new ObtenerReporteHandler(contexto, new SecopClientFalso(), new NasaFirmsClientFalso());

        var respuesta = await handler.Handle(new ObtenerReporteQuery("RPT-2026-08-15-0011"), CancellationToken.None);

        Assert.Null(respuesta.VerificacionSatelital);
        Assert.Empty(await contexto.VerificacionesSatelitales.ToListAsync());
    }
}
