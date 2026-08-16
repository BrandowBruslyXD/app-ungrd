using MediatR;

namespace ConectaRiesgoAI.Api.Features.Reportes.ObtenerReporte;

public record ObtenerReporteQuery(string Codigo) : IRequest<ObtenerReporteResponse>;
