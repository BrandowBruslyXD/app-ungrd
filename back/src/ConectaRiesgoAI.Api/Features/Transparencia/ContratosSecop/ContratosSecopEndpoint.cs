using ConectaRiesgoAI.Api.Common.Endpoints;
using MediatR;

namespace ConectaRiesgoAI.Api.Features.Transparencia.ContratosSecop;

/// <summary>
/// Expone <c>GET /api/transparencia/secop</c>. Público a propósito: es información de contratación
/// pública, ya pública de por sí en Datos Abiertos de Colombia — no hay dato de ningún ciudadano
/// que proteger aquí.
/// </summary>
public class ContratosSecopEndpoint : IEndpoint
{
    public void Map(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/transparencia/secop", async (string municipio, ISender sender, CancellationToken cancellationToken) =>
                Results.Ok(await sender.Send(new ContratosSecopQuery(municipio), cancellationToken)))
            .AllowAnonymous()
            .RequireRateLimiting("secop")
            .WithName("ContratosSecop")
            .WithTags("Transparencia");
    }
}
