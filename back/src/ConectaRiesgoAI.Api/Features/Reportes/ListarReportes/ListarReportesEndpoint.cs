using ConectaRiesgoAI.Api.Common.Endpoints;
using MediatR;

namespace ConectaRiesgoAI.Api.Features.Reportes.ListarReportes;

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
