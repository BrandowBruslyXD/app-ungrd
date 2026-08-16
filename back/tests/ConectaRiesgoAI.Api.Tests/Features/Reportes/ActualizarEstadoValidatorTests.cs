using ConectaRiesgoAI.Api.Domain.Enums;
using ConectaRiesgoAI.Api.Features.Reportes.ActualizarEstado;

namespace ConectaRiesgoAI.Api.Tests.Features.Reportes;

public class ActualizarEstadoValidatorTests
{
    private static readonly ActualizarEstadoValidator Validador = new();

    [Fact]
    public void Validate_ComandoValido_Pasa()
    {
        var comando = new ActualizarEstadoCommand("RPT-2026-08-15-0047", EstadoReporte.EnAtencion, "Brigada en camino");

        var resultado = Validador.Validate(comando);

        Assert.True(resultado.IsValid);
    }

    [Fact]
    public void Validate_NotaVacia_Falla()
    {
        var comando = new ActualizarEstadoCommand("RPT-2026-08-15-0047", EstadoReporte.EnAtencion, "");

        var resultado = Validador.Validate(comando);

        Assert.False(resultado.IsValid);
        Assert.Contains(resultado.Errors, e => e.PropertyName == nameof(ActualizarEstadoCommand.Nota));
    }

    [Fact]
    public void Validate_CodigoVacio_Falla()
    {
        var comando = new ActualizarEstadoCommand("", EstadoReporte.EnAtencion, "Brigada en camino");

        var resultado = Validador.Validate(comando);

        Assert.False(resultado.IsValid);
        Assert.Contains(resultado.Errors, e => e.PropertyName == nameof(ActualizarEstadoCommand.Codigo));
    }
}
