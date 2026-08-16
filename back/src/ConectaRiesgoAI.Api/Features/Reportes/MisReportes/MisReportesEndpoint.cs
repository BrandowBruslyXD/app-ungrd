using ConectaRiesgoAI.Api.Common.Auth;
using ConectaRiesgoAI.Api.Common.Endpoints;
using MediatR;

namespace ConectaRiesgoAI.Api.Features.Reportes.MisReportes;

public class MisReportesEndpoint : IEndpoint
{
    public void Map(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/reportes/mios", async (IUsuarioActual usuarioActual, ISender sender) =>
                Results.Ok(await sender.Send(new MisReportesQuery(usuarioActual.Id!.Value))))
            .RequireAuthorization()
            .WithName("MisReportes")
            .WithTags("Reportes");
    }
}
