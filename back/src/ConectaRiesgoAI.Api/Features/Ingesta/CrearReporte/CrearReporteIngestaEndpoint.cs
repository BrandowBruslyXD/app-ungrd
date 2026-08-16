using ConectaRiesgoAI.Api.Common.Auth;
using ConectaRiesgoAI.Api.Common.Endpoints;
using MediatR;

namespace ConectaRiesgoAI.Api.Features.Ingesta.CrearReporte;

/// <summary>Mapea <c>POST /api/ingesta/reportes</c> (ver docs/INTEGRACION-BOT-BACKEND.md, sección 3.1).</summary>
public class CrearReporteIngestaEndpoint : IEndpoint
{
    public void Map(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/ingesta/reportes", async (CrearReporteIngestaCommand comando, ISender sender, CancellationToken ct) =>
            {
                CrearReporteIngestaResponse respuesta = await sender.Send(comando, ct);
                return Results.Created((string?)null, respuesta);
            })
            // No es JWT: el bot se autentica como servicio con X-Api-Key, no como un usuario.
            .RequireAuthorization(AuthExtensions.Politicas.ServicioIngesta)
            .WithName("IngestaCrearReporte")
            .WithTags("Ingesta");
    }
}
