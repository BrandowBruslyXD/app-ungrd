namespace ConectaRiesgoAI.Api.Integrations.Storage;

/// <summary>
/// Salida de <see cref="IAlmacenamientoDeArchivos.SubirAsync"/>. Nunca lanza excepción por
/// fallas de Azure: un fallo se representa aquí, con <see cref="Exitoso"/> en falso.
/// </summary>
/// <param name="Exitoso">Si la subida terminó bien y hay URL firmada.</param>
/// <param name="UrlFirmada">La URL con firma (SAS) y expiración. Solo si <see cref="Exitoso"/>.</param>
/// <param name="Error">Detalle para el log. Nunca se expone al cliente.</param>
public record ResultadoSubida(bool Exitoso, string? UrlFirmada, string? Error);
