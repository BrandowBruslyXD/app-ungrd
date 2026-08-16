using ConectaRiesgoAI.Api.Common.Auth;
using ConectaRiesgoAI.Api.Common.Endpoints;
using MediatR;

namespace ConectaRiesgoAI.Api.Features.Reportes.CrearReporte;

public class CrearReporteEndpoint : IEndpoint
{
    public void Map(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/reportes", async (CrearReporteCommand peticion, IUsuarioActual usuarioActual, ISender sender) =>
            {
                var comando = peticion with { UsuarioId = usuarioActual.Id!.Value };
                var respuesta = await sender.Send(comando);
                return Results.Created($"/api/reportes/{respuesta.Codigo}", respuesta);
            })
            .RequireAuthorization()
            .WithName("CrearReporte")
            .WithTags("Reportes");
    }
}
