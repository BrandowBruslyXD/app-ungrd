using ConectaRiesgoAI.Api.Integrations.Nasa;
using MediatR;

namespace ConectaRiesgoAI.Api.Features.Verificacion.VerificacionSatelital;

/// <summary>
/// Traduce al DTO de salida. Sin lógica propia: toda la resiliencia (timeout, MAP_KEY, CSV) vive
/// en <see cref="INasaFirmsClient"/>, que nunca lanza.
/// </summary>
public class VerificacionSatelitalHandler(INasaFirmsClient nasaFirmsClient)
    : IRequestHandler<VerificacionSatelitalQuery, VerificacionSatelitalResponse?>
{
    public async Task<VerificacionSatelitalResponse?> Handle(VerificacionSatelitalQuery query, CancellationToken cancellationToken)
    {
        ResultadoVerificacionSatelital? resultado = await nasaFirmsClient.ConsultarFocosDeCalorAsync(
            query.Lat, query.Lng, query.RadioKm, cancellationToken);

        return resultado is null
            ? null
            : new VerificacionSatelitalResponse(
                "NASA FIRMS",
                resultado.Confirmado,
                resultado.FocosDetectados,
                resultado.DistanciaMasCercanaKm,
                resultado.Detalle,
                DateTime.UtcNow);
    }
}
