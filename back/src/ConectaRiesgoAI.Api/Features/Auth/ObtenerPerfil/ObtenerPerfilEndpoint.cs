using ConectaRiesgoAI.Api.Common.Endpoints;
using ConectaRiesgoAI.Api.Features.Auth;
using MediatR;

namespace ConectaRiesgoAI.Api.Features.Auth.ObtenerPerfil;

/// <summary>Mapea <c>GET /api/auth/yo</c> (ver CONTRATO-API.md).</summary>
public class ObtenerPerfilEndpoint : IEndpoint
{
    public void Map(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/auth/yo", async (ISender sender, CancellationToken ct) =>
            {
                UsuarioDto respuesta = await sender.Send(new ObtenerPerfilQuery(), ct);
                return Results.Ok(respuesta);
            })
            .RequireAuthorization()
            .WithName("ObtenerPerfil")
            .WithTags("Auth");
    }
}
