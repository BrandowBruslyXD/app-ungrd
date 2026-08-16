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

    [Fact]
    public void Validate_EstadoAusente_FallaConMensajeExplicitoDeObligatorio()
    {
        // Un JSON que omite "estado" deserializa a null (no al primer valor del enum): sin este
        // caso, "estado ausente" y "transición inválida a Reportado" darían el mismo 400 confuso.
        var comando = new ActualizarEstadoCommand("RPT-2026-08-15-0047", null, "Brigada en camino");

        var resultado = Validador.Validate(comando);

        Assert.False(resultado.IsValid);
        var error = Assert.Single(resultado.Errors, e => e.PropertyName == nameof(ActualizarEstadoCommand.Estado));
        Assert.Equal("El estado es obligatorio", error.ErrorMessage);
    }
}
