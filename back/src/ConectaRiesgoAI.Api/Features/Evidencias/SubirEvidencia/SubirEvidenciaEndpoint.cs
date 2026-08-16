using ConectaRiesgoAI.Api.Common.Endpoints;
using ConectaRiesgoAI.Api.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ConectaRiesgoAI.Api.Features.Evidencias.SubirEvidencia;

/// <summary>
/// Sube una foto a Azure Blob Storage y devuelve su URL firmada. No crea ni asocia ningún
/// registro en la base de datos: el llamador (p.ej. quien cree un reporte) decide qué hacer
/// con la URL — igual que hoy se hace con la URL que devuelve Cloudinary.
/// </summary>
public class SubirEvidenciaEndpoint : IEndpoint
{
    public void Map(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/evidencias", Handle)
            .RequireAuthorization()
            .DisableAntiforgery()
            .WithName("SubirEvidencia")
            .WithTags("Evidencias");
    }

    private static async Task<IResult> Handle(
        [FromForm] IFormFile archivo,
        [FromForm] TipoEvidencia tipo,
        ISender sender,
        CancellationToken cancellationToken)
    {
        await using var contenido = archivo.OpenReadStream();
        var comando = new SubirEvidenciaCommand(tipo, archivo.ContentType, archivo.Length, contenido);

        var respuesta = await sender.Send(comando, cancellationToken);
        return Results.Json(respuesta, statusCode: StatusCodes.Status201Created);
    }
}
