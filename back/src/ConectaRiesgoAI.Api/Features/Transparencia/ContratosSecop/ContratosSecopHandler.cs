using ConectaRiesgoAI.Api.Integrations.Secop;
using MediatR;

namespace ConectaRiesgoAI.Api.Features.Transparencia.ContratosSecop;

/// <summary>
/// Contratos de prevención del riesgo del municipio, para el bloque de transparencia de la
/// alcaldía. La rebanada no tiene lógica propia más allá de traducir al DTO de salida: toda la
/// resiliencia (timeout, caché, respaldo) vive en <see cref="ISecopClient"/>, que nunca lanza.
/// </summary>
public class ContratosSecopHandler(ISecopClient secopClient) : IRequestHandler<ContratosSecopQuery, List<ContratoSecopResponse>>
{
    public async Task<List<ContratoSecopResponse>> Handle(ContratosSecopQuery query, CancellationToken cancellationToken)
    {
        IReadOnlyList<ContratoSecop> contratos = await secopClient.ConsultarPorMunicipioAsync(query.Municipio, cancellationToken);
        return contratos
            .Select(c => new ContratoSecopResponse(c.Objeto, c.Valor, c.Anio, c.Entidad))
            .ToList();
    }
}
