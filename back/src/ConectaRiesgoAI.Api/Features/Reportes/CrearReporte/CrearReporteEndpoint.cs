using ConectaRiesgoAI.Api.Common.Auth;
using ConectaRiesgoAI.Api.Common.Endpoints;
using MediatR;

namespace ConectaRiesgoAI.Api.Features.Reportes.CrearReporte;

/// <summary>Expone <c>POST /api/reportes</c>. Requiere estar autenticado; el rol no se restringe.</summary>
public class CrearReporteEndpoint : IEndpoint
{
    public void Map(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/reportes", async (CrearReporteCommand peticion, IUsuarioActual usuarioActual, ISender sender) =>
            {
                var usuarioId = usuarioActual.Id
                    ?? throw new InvalidOperationException("El token no trae el identificador del usuario");
                var comando = peticion with { UsuarioId = usuarioId };
                var respuesta = await sender.Send(comando);
                return Results.Created($"/api/reportes/{respuesta.Codigo}", respuesta);
            })
            .RequireAuthorization()
            .WithName("CrearReporte")
            .WithTags("Reportes");
    }
}
