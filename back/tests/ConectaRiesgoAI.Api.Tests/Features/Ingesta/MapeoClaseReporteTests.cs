using ConectaRiesgoAI.Api.Features.Ingesta.CrearReporte;

namespace ConectaRiesgoAI.Api.Tests.Features.Ingesta;

public class MapeoClaseReporteTests
{
    [Theory]
    [InlineData("afectacion_propia", true)]
    [InlineData("  AFECTACION_PROPIA  ", true)]
    [InlineData("aviso_evento", true)]
    [InlineData("desconocida", false)]
    [InlineData(null, false)]
    [InlineData("", false)]
    public void TryMapear_ValoresConocidosYDesconocidos(string? entrada, bool esperado)
    {
        bool mapeado = MapeoClaseReporte.TryMapear(entrada, out Domain.Enums.ClaseReporte clase);

        Assert.Equal(esperado, mapeado);
        if (esperado)
        {
            Assert.True(clase is Domain.Enums.ClaseReporte.AfectacionPropia or Domain.Enums.ClaseReporte.AvisoEvento);
        }
    }
}
