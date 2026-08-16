using ConectaRiesgoAI.Api.Integrations.Secop;

namespace ConectaRiesgoAI.Api.Tests.Integrations.Secop;

/// <summary>
/// Doble de prueba de <see cref="ISecopClient"/>. El cliente real nunca lanza (esa garantía se
/// prueba en <c>SecopClientTests</c>), así que este doble solo necesita devolver lo que se le
/// configure — sirve para probar que los handlers que lo consumen no rompen con lista vacía.
/// </summary>
public class SecopClientFalso : ISecopClient
{
    private readonly IReadOnlyList<ContratoSecop> _respuesta;

    public SecopClientFalso(IReadOnlyList<ContratoSecop>? respuesta = null)
    {
        _respuesta = respuesta ?? [];
    }

    public string? UltimoMunicipioConsultado { get; private set; }

    public Task<IReadOnlyList<ContratoSecop>> ConsultarPorMunicipioAsync(string municipio, CancellationToken cancellationToken)
    {
        UltimoMunicipioConsultado = municipio;
        return Task.FromResult(_respuesta);
    }
}
