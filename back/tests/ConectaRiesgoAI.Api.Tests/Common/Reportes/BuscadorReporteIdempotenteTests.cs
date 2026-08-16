using ConectaRiesgoAI.Api.Common.Reportes;
using ConectaRiesgoAI.Api.Domain.Entities;
using ConectaRiesgoAI.Api.Domain.Enums;
using ConectaRiesgoAI.Api.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ConectaRiesgoAI.Api.Tests.Common.Reportes;

public class BuscadorReporteIdempotenteTests
{
    private static AppDbContext NuevoContexto() => new(
        new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task BuscarExistente_ReferenciaVacia_DevuelveNull(string? referencia)
    {
        using AppDbContext db = NuevoContexto();
        BuscadorReporteIdempotente buscador = new(db);

        Reporte? resultado = await buscador.BuscarExistenteAsync(
            CanalOrigen.WhatsApp, referencia, CancellationToken.None);

        Assert.Null(resultado);
    }

    [Fact]
    public void EsDuplicado_InnerExceptionNoEsPostgres_DevuelveFalse()
    {
        BuscadorReporteIdempotente buscador = new(NuevoContexto());
        DbUpdateException excepcion = new("otro", new InvalidOperationException());

        Assert.False(buscador.EsDuplicadoDeReferenciaExterna(excepcion));
    }
}
