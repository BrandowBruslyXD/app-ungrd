using ConectaRiesgoAI.Api.Common.Endpoints;
using MediatR;

namespace ConectaRiesgoAI.Api.Features.Auth.Login;

public class LoginEndpoint : IEndpoint
{
    public void Map(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/auth/login", async (LoginCommand comando, ISender sender, CancellationToken ct) =>
            {
                var respuesta = await sender.Send(comando, ct);
                return Results.Ok(respuesta);
            })
            .AllowAnonymous()
            .WithName("Login")
            .WithTags("Auth");
    }
}
