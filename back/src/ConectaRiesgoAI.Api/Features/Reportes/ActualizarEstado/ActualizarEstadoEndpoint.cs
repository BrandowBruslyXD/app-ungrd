using ConectaRiesgoAI.Api.Common.Auth;
using ConectaRiesgoAI.Api.Common.Endpoints;
using MediatR;

namespace ConectaRiesgoAI.Api.Features.Reportes.ActualizarEstado;

/// <summary>Mapea <c>PATCH /api/reportes/{codigo}/estado</c> (ver CONTRATO-API.md).</summary>
public class ActualizarEstadoEndpoint : IEndpoint
{
    public void Map(IEndpointRouteBuilder app)
    {
        app.MapPatch("/api/reportes/{codigo}/estado",
                async (string codigo, ActualizarEstadoRequest cuerpo, ISender sender, CancellationToken ct) =>
                {
                    ActualizarEstadoCommand comando = new(codigo, cuerpo.Estado, cuerpo.Nota);
                    ActualizarEstadoResponse respuesta = await sender.Send(comando, ct);
                    return Results.Ok(respuesta);
                })
            .RequireAuthorization(AuthExtensions.Politicas.Gestor)
            .WithName("ActualizarEstado")
            .WithTags("Reportes");
    }
}
