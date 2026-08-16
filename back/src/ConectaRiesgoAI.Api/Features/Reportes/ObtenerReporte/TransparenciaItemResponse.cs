namespace ConectaRiesgoAI.Api.Features.Reportes.ObtenerReporte;

/// <summary>
/// Forma del bloque de transparencia (SECOP) que define CONTRATO-API.md. La integración es
/// otra rebanada (`area:datos`, todavía sin construir): mientras tanto este endpoint siempre
/// devuelve la lista vacía, que es la respuesta segura que ya contempla el contrato.
/// </summary>
public record TransparenciaItemResponse(string Objeto, decimal Valor, int Anio, string Entidad);
