using ConectaRiesgoAI.Api.Integrations.Nasa;

namespace ConectaRiesgoAI.Api.Tests.Integrations.Nasa;

/// <summary>
/// Doble de prueba de <see cref="INasaFirmsClient"/>. El cliente real nunca lanza (esa garantía
/// se prueba en <c>NasaFirmsClientTests</c>), así que este doble solo necesita devolver lo que se
/// le configure — sirve para probar que los handlers que lo consumen no rompen con <c>null</c>.
/// </summary>
public class NasaFirmsClientFalso(ResultadoVerificacionSatelital? respuesta = null) : INasaFirmsClient
{
    public int VecesLlamado { get; private set; }
    public double? UltimoRadioKmConsultado { get; private set; }

    public Task<ResultadoVerificacionSatelital?> ConsultarFocosDeCalorAsync(double lat, double lng, double radioKm, CancellationToken cancellationToken)
    {
        VecesLlamado++;
        UltimoRadioKmConsultado = radioKm;
        return Task.FromResult(respuesta);
    }
}
