namespace ConectaRiesgoAI.Api.Features.Transparencia.ContratosSecop;

/// <summary>
/// Forma del bloque de transparencia que define CONTRATO-API.md. Coincide a propósito con
/// <c>TransparenciaItemResponse</c> de <c>Reportes/ObtenerReporte</c> — es la misma forma en dos
/// rebanadas independientes (cero acoplamiento entre rebanadas, CLAUDE.md), no un tipo compartido.
/// </summary>
public record ContratoSecopResponse(string Objeto, decimal Valor, int Anio, string Entidad);
