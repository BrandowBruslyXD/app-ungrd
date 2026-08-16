using ConectaRiesgoAI.Api.Common.Endpoints;
using MediatR;

namespace ConectaRiesgoAI.Api.Features.Reportes.ObtenerReporte;

/// <summary>
/// Expone <c>GET /api/reportes/{codigo}</c>. Público a propósito: alimenta la pantalla de
/// seguimiento antes de que nadie inicie sesión — cualquiera con el código puede ver el estado.
/// </summary>
public class ObtenerReporteEndpoint : IEndpoint
{
    public void Map(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/reportes/{codigo}", async (string codigo, ISender sender) =>
                Results.Ok(await sender.Send(new ObtenerReporteQuery(codigo))))
            .WithName("ObtenerReporte")
            .WithTags("Reportes");
    }
}
