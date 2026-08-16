using ConectaRiesgoAI.Api.Common.Endpoints;
using MediatR;

namespace ConectaRiesgoAI.Api.Features.Estadisticas.ResumenEstadisticas;

/// <summary>
/// Expone <c>GET /api/estadisticas/resumen</c>. Público a propósito: son cifras agregadas sin
/// dato personal, y el contrato ya lo marca "— público" (alimenta el dashboard antes de loguearse).
/// </summary>
public class ResumenEstadisticasEndpoint : IEndpoint
{
    public void Map(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/estadisticas/resumen", async ([AsParameters] ResumenEstadisticasQuery query, ISender sender) =>
                Results.Ok(await sender.Send(query)))
            .AllowAnonymous()
            .WithName("ResumenEstadisticas")
            .WithTags("Estadisticas");
    }
}
