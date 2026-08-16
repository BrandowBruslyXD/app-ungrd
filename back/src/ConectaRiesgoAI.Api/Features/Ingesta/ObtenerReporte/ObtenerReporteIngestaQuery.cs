using MediatR;

namespace ConectaRiesgoAI.Api.Features.Ingesta.ObtenerReporte;

/// <summary>Petición de <c>GET /api/ingesta/reportes/{codigo}</c> (ver docs/INTEGRACION-BOT-BACKEND.md, sección 3.2).</summary>
public record ObtenerReporteIngestaQuery(string Codigo) : IRequest<ObtenerReporteIngestaResponse>;
