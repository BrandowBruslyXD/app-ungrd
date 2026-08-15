using ConectaRiesgoAI.Api.Common.Endpoints;
using MediatR;

namespace ConectaRiesgoAI.Api.Features.Auth.ObtenerPerfil;

public class ObtenerPerfilEndpoint : IEndpoint
{
    public void Map(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/auth/yo", async (ISender sender, CancellationToken ct) =>
            {
                var respuesta = await sender.Send(new ObtenerPerfilQuery(), ct);
                return Results.Ok(respuesta);
            })
            .RequireAuthorization()
            .WithName("ObtenerPerfil")
            .WithTags("Auth");
    }
}
