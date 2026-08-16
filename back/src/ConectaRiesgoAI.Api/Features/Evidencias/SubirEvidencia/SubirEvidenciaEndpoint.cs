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
        await using Stream contenido = archivo.OpenReadStream();
        SubirEvidenciaCommand comando = new(tipo, archivo.ContentType, archivo.Length, contenido);

        SubirEvidenciaResponse respuesta = await sender.Send(comando, cancellationToken);

        // 201 solo si de verdad se creó un blob. Si Azure no respondió, no es un error del
        // servidor (nunca 500: issue #47, escenario "el blob no está disponible") — es un 200
        // con Subida = false, para no afirmar una creación que no ocurrió.
        int estado = respuesta.Subida ? StatusCodes.Status201Created : StatusCodes.Status200OK;
        return Results.Json(respuesta, statusCode: estado);
    }
}
