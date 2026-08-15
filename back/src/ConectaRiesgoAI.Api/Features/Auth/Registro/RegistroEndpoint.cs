using ConectaRiesgoAI.Api.Common.Endpoints;
using MediatR;

namespace ConectaRiesgoAI.Api.Features.Auth.Registro;

public class RegistroEndpoint : IEndpoint
{
    public void Map(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/auth/registro", async (RegistroCommand comando, ISender sender, CancellationToken ct) =>
            {
                RegistroResponse respuesta = await sender.Send(comando, ct);
                return Results.Created((string?)null, respuesta);
            })
            // Anónimo porque es el único endpoint que le da un token a alguien que todavía no lo tiene.
            .AllowAnonymous()
            .WithName("Registro")
            .WithTags("Auth");
    }
}
