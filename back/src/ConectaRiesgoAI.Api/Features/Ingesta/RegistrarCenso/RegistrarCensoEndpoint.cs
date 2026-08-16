using ConectaRiesgoAI.Api.Common.Auth;
using ConectaRiesgoAI.Api.Common.Endpoints;
using MediatR;

namespace ConectaRiesgoAI.Api.Features.Ingesta.RegistrarCenso;

/// <summary>Mapea <c>POST /api/ingesta/censo</c> (ver docs/INTEGRACION-BOT-BACKEND.md, sección 3.3).</summary>
public class RegistrarCensoEndpoint : IEndpoint
{
    public void Map(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/ingesta/censo", async (RegistrarCensoCommand comando, ISender sender, CancellationToken ct) =>
            {
                RegistrarCensoResponse respuesta = await sender.Send(comando, ct);
                return Results.Created((string?)null, respuesta);
            })
            // No es JWT: el bot se autentica como servicio con X-Api-Key, no como un usuario.
            // La acreditación del brigadista concreto la valida el handler contra su teléfono.
            .RequireAuthorization(AuthExtensions.Politicas.ServicioIngesta)
            .WithName("IngestaRegistrarCenso")
            .WithTags("Ingesta");
    }
}
