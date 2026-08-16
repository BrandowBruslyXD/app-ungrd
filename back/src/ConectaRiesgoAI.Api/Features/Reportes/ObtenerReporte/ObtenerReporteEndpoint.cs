using ConectaRiesgoAI.Api.Common.Endpoints;
using MediatR;

namespace ConectaRiesgoAI.Api.Features.Reportes.ObtenerReporte;

public class ObtenerReporteEndpoint : IEndpoint
{
    public void Map(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/reportes/{codigo}", async (string codigo, ISender sender) =>
                Results.Ok(await sender.Send(new ObtenerReporteQuery(codigo))))
            .WithName("ObtenerReporte")
            .WithTags("Reportes");
    }
}
