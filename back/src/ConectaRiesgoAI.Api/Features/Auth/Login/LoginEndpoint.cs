using ConectaRiesgoAI.Api.Common.Endpoints;
using MediatR;

namespace ConectaRiesgoAI.Api.Features.Auth.Login;

/// <summary>Mapea <c>POST /api/auth/login</c> (ver CONTRATO-API.md).</summary>
public class LoginEndpoint : IEndpoint
{
    public void Map(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/auth/login", async (LoginCommand comando, ISender sender, CancellationToken ct) =>
            {
                LoginResponse respuesta = await sender.Send(comando, ct);
                return Results.Ok(respuesta);
            })
            // Anónimo porque loguearse es, por definición, lo que pasa antes de tener un token.
            .AllowAnonymous()
            .WithName("Login")
            .WithTags("Auth");
    }
}
