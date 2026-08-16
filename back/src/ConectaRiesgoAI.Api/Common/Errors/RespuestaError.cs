namespace ConectaRiesgoAI.Api.Common.Errors;

/// <summary>
/// La única forma de error que devuelve la API. El frontend solo tiene que saber leer esta.
/// Definida en CONTRATO-API.md — no inventar otras.
/// </summary>
/// <param name="Error">Mensaje para mostrarle a la persona.</param>
/// <param name="Detalles">En errores de validación, qué campo falló y por qué. Si no, <c>null</c>.</param>
public record RespuestaError(string Error, IDictionary<string, string>? Detalles = null);
