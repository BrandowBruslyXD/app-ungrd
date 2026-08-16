namespace ConectaRiesgoAI.Api.Features.Evidencias.SubirEvidencia;

/// <param name="UrlFoto">URL firmada y temporal. <c>null</c> si Azure Blob Storage no respondió.</param>
/// <param name="Subida">
/// Si quedó guardada de verdad. En falso, quien llama decide qué hacer — nunca es un error 500:
/// ver el escenario "Blob no disponible" del issue #47.
/// </param>
public record SubirEvidenciaResponse(string? UrlFoto, bool Subida);
