using ConectaRiesgoAI.Api.Common.Auth;
using ConectaRiesgoAI.Api.Common.Endpoints;
using MediatR;

namespace ConectaRiesgoAI.Api.Features.Reportes.MisReportes;

/// <summary>Expone <c>GET /api/reportes/mios</c>. Los reportes del usuario del token.</summary>
public class MisReportesEndpoint : IEndpoint
{
    public void Map(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/reportes/mios", async (IUsuarioActual usuarioActual, ISender sender) =>
            {
                int usuarioId = usuarioActual.Id
                    ?? throw new InvalidOperationException("El token no trae el identificador del usuario");
                return Results.Ok(await sender.Send(new MisReportesQuery(usuarioId)));
            })
            .RequireAuthorization()
            .WithName("MisReportes")
            .WithTags("Reportes");
    }
}
