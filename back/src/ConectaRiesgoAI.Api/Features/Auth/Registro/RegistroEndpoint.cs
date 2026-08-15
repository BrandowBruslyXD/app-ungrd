using ConectaRiesgoAI.Api.Common.Endpoints;
using MediatR;

namespace ConectaRiesgoAI.Api.Features.Auth.Registro;

public class RegistroEndpoint : IEndpoint
{
    public void Map(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/auth/registro", async (RegistroCommand comando, ISender sender, CancellationToken ct) =>
            {
                var respuesta = await sender.Send(comando, ct);
                return Results.Created((string?)null, respuesta);
            })
            .AllowAnonymous()
            .WithName("Registro")
            .WithTags("Auth");
    }
}
