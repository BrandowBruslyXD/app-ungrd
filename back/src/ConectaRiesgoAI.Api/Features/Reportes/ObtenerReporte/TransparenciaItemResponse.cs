namespace ConectaRiesgoAI.Api.Features.Reportes.ObtenerReporte;

/// <summary>
/// Forma del bloque de transparencia (SECOP) que define CONTRATO-API.md. Coincide a propósito
/// con <c>ContratoSecopResponse</c> de <c>Transparencia/ContratosSecop</c> — misma forma en dos
/// rebanadas independientes, no un tipo compartido (cero acoplamiento entre rebanadas).
/// </summary>
public record TransparenciaItemResponse(string Objeto, decimal Valor, int Anio, string Entidad);
