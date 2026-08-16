using MediatR;

namespace ConectaRiesgoAI.Api.Features.Reportes.MisReportes;

/// <param name="UsuarioId">Sale del token; el endpoint lo completa, nunca del cliente.</param>
public record MisReportesQuery(int UsuarioId) : IRequest<List<ReporteResumenResponse>>;
