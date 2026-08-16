using MediatR;

namespace ConectaRiesgoAI.Api.Features.Transparencia.ContratosSecop;

/// <summary>Consulta los contratos de prevención del riesgo de un municipio en SECOP.</summary>
public record ContratosSecopQuery(string Municipio) : IRequest<List<ContratoSecopResponse>>;
