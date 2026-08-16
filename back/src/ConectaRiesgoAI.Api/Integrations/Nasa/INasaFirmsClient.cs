namespace ConectaRiesgoAI.Api.Integrations.Nasa;

/// <summary>
/// Cliente de la integración con NASA FIRMS. Interfaz con una sola implementación
/// (<see cref="NasaFirmsClient"/>), justificada por testabilidad: permite mockear la llamada
/// externa en los tests de los handlers que la consumen sin tocar HTTP real.
/// </summary>
public interface INasaFirmsClient
{
    /// <summary>
    /// Busca focos de calor detectados por satélite dentro de <paramref name="radioKm"/> del
    /// punto dado. Ante cualquier falla de la integración (sin MAP_KEY, timeout, HTTP, CSV
    /// inesperado) nunca lanza: devuelve <c>null</c>, es decir "verificación no disponible" — el
    /// reporte se muestra igual sin el bloque satelital.
    /// </summary>
    /// <exception cref="OperationCanceledException">
    /// El propio <paramref name="cancellationToken"/> se canceló (el caller cortó la petición).
    /// No es una falla de NASA FIRMS: no hay nadie esperando el resultado, así que se propaga en
    /// vez de aparentar una verificación que nadie va a leer.
    /// </exception>
    Task<ResultadoVerificacionSatelital?> ConsultarFocosDeCalorAsync(double lat, double lng, double radioKm, CancellationToken cancellationToken);
}
