namespace ConectaRiesgoAI.Api.Integrations.Secop;

/// <summary>
/// Cliente de la integración con SECOP (Datos Abiertos de Colombia). Interfaz con una sola
/// implementación (<see cref="SecopClient"/>), justificada por testabilidad: permite mockear la
/// llamada externa en los tests de los handlers que la consumen sin tocar HTTP real.
/// </summary>
public interface ISecopClient
{
    /// <summary>
    /// Devuelve hasta el tope configurado de contratos de prevención del municipio, ordenados
    /// por valor descendente. Ante cualquier falla de la integración (timeout, HTTP,
    /// deserialización) nunca lanza: devuelve lista vacía o los datos de respaldo, según
    /// configuración — la pantalla que consume esto no puede caerse porque SECOP esté lento o
    /// caído.
    /// </summary>
    /// <exception cref="OperationCanceledException">
    /// El propio <paramref name="cancellationToken"/> se canceló (el caller cortó la petición).
    /// No es una falla de SECOP: no hay nadie esperando el respaldo, así que se propaga en vez de
    /// aparentar éxito con datos que nadie va a leer.
    /// </exception>
    Task<IReadOnlyList<ContratoSecop>> ConsultarPorMunicipioAsync(string municipio, CancellationToken cancellationToken);
}
