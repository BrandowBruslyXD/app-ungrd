using ConectaRiesgoAI.Api.Common.Endpoints;
using MediatR;

namespace ConectaRiesgoAI.Api.Features.Reportes.ListarReportes;

/// <summary>
/// Expone <c>GET /api/reportes</c>. Público a propósito: alimenta el mapa y el dashboard antes
/// de que nadie inicie sesión, tal como lo marca el contrato ("GET /api/reportes — público").
/// </summary>
public class ListarReportesEndpoint : IEndpoint
{
    public void Map(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/reportes", async ([AsParameters] ListarReportesQuery query, ISender sender) =>
                Results.Ok(await sender.Send(query)))
            .WithName("ListarReportes")
            .WithTags("Reportes");
    }
}
