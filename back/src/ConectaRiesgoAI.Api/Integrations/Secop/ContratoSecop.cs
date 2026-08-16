namespace ConectaRiesgoAI.Api.Integrations.Secop;

/// <summary>
/// Contrato de SECOP ya normalizado (parseado y validado), lo que devuelve <see cref="ISecopClient"/>.
/// Cada rebanada que lo consume (<c>Transparencia/ContratosSecop</c>, <c>Reportes/ObtenerReporte</c>)
/// lo mapea a su propio DTO de salida — este tipo no se serializa directo al cliente HTTP.
/// </summary>
public record ContratoSecop(string Objeto, decimal Valor, int Anio, string Entidad);
