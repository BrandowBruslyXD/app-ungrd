using ConectaRiesgoAI.Api.Common.Endpoints;
using MediatR;

namespace ConectaRiesgoAI.Api.Features.Ingesta.ObtenerReporte;

/// <summary>
/// Expone <c>GET /api/ingesta/reportes/{codigo}</c>: ruta propia del bot, distinta de
/// <c>GET /api/reportes/{codigo}</c> que consume la web (ver docs/INTEGRACION-BOT-BACKEND.md,
/// sección 3.2). Pública a propósito, igual que la ruta de la web: el código funciona como
/// número de guía, quien lo tiene accede.
/// </summary>
public class ObtenerReporteIngestaEndpoint : IEndpoint
{
    public void Map(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/ingesta/reportes/{codigo}", async (string codigo, ISender sender) =>
                Results.Ok(await sender.Send(new ObtenerReporteIngestaQuery(codigo))))
            .WithName("IngestaObtenerReporte")
            .WithTags("Ingesta");
    }
}
