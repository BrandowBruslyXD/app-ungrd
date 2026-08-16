using ConectaRiesgoAI.Api.Common.Endpoints;
using MediatR;

namespace ConectaRiesgoAI.Api.Features.Verificacion.VerificacionSatelital;

/// <summary>
/// Expone <c>GET /api/verificacion/satelital</c>. Público a propósito: no consulta ningún dato de
/// ningún reporte ni ciudadano, solo pasa lat/lng/radio a NASA FIRMS — sirve para probar la
/// integración por separado (CONTRATO-API.md, sección 4).
/// </summary>
public class VerificacionSatelitalEndpoint : IEndpoint
{
    public void Map(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/verificacion/satelital",
                async (double lat, double lng, double radioKm, ISender sender, CancellationToken cancellationToken) =>
                    Results.Ok(await sender.Send(new VerificacionSatelitalQuery(lat, lng, radioKm), cancellationToken)))
            .AllowAnonymous()
            .RequireRateLimiting("nasa")
            .WithName("VerificacionSatelital")
            .WithTags("Verificacion");
    }
}
