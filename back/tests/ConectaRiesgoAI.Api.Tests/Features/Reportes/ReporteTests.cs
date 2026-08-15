using ConectaRiesgoAI.Api.Domain.Entities;
using ConectaRiesgoAI.Api.Domain.Enums;

namespace ConectaRiesgoAI.Api.Tests.Features.Reportes;

public class ReporteTests
{
    private static Reporte NuevoReporte() => new()
    {
        Codigo = "RPT-2026-08-15-0001",
        Tipo = TipoReporte.Inundacion,
        Descripcion = "Se está inundando la vía principal",
        Municipio = "Bogotá",
        Latitud = 4.710989,
        Longitud = -74.072092
    };

    [Fact]
    public void GenerarCodigo_UsaElFormatoDelContrato()
    {
        var codigo = Reporte.GenerarCodigo(new DateTime(2026, 8, 15), 47);

        Assert.Equal("RPT-2026-08-15-0047", codigo);
    }

    [Fact]
    public void CambiarEstado_AvanzaYDejaHuellaEnLaCronologia()
    {
        var reporte = NuevoReporte();

        reporte.CambiarEstado(EstadoReporte.Verificado, "Confirmado por satélite", "Sistema");

        Assert.Equal(EstadoReporte.Verificado, reporte.Estado);
        var evento = Assert.Single(reporte.Cronologia);
        Assert.Equal(EstadoReporte.Verificado, evento.Estado);
        Assert.Equal("Confirmado por satélite", evento.Nota);
        Assert.Equal("Sistema", evento.Responsable);
    }

    [Fact]
    public void CambiarEstado_PermiteSaltarHaciaAdelante()
    {
        var reporte = NuevoReporte();

        reporte.CambiarEstado(EstadoReporte.Asignado, "Asignado a la Alcaldía", "Carlos M.");

        Assert.Equal(EstadoReporte.Asignado, reporte.Estado);
    }

    [Theory]
    [InlineData(EstadoReporte.Reportado)]   // el mismo en el que ya está
    [InlineData(EstadoReporte.Verificado)]  // uno anterior
    public void CambiarEstado_NoPermiteRetrocederNiRepetir(EstadoReporte destino)
    {
        var reporte = NuevoReporte();
        reporte.CambiarEstado(EstadoReporte.Asignado, "Asignado", "Carlos M.");

        var error = Assert.Throws<InvalidOperationException>(
            () => reporte.CambiarEstado(destino, "Intento inválido", "Carlos M."));

        Assert.Contains("solo avanzan", error.Message);
        Assert.Equal(EstadoReporte.Asignado, reporte.Estado);
        Assert.Single(reporte.Cronologia);
    }
}
