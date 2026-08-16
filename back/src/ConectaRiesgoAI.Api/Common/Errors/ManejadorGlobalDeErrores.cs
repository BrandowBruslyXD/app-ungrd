using System.Text.Json;
using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;

namespace ConectaRiesgoAI.Api.Common.Errors;

/// <summary>
/// Traduce cualquier excepción a la forma de error del contrato.
/// Los slices lanzan excepciones y se olvidan del formato.
/// </summary>
public class ManejadorGlobalDeErrores(ILogger<ManejadorGlobalDeErrores> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var (estado, respuesta) = exception switch
        {
            ValidationException v => (
                StatusCodes.Status400BadRequest,
                new RespuestaError("Datos inválidos", v.Errors
                    .GroupBy(e => ACamelCase(e.PropertyName))
                    .ToDictionary(g => g.Key, g => g.First().ErrorMessage))),

            // Cuerpo mal formado o un enum con un valor que no existe (p. ej. tipo "Sismo"
            // antes de que estuviera en TipoReporte). Es un error de quien llama, no del
            // servidor: devolvía 500 y el cliente no tenía forma de saber qué corregir.
            // El bot, además, no distingue un 500 de un éxito y responde "reporte recibido".
            // ASP.NET envuelve el fallo de deserializacion en BadHttpRequestException, asi
            // que hay que mirar la excepcion interna para saber que campo fallo.
            BadHttpRequestException { InnerException: JsonException ji } => (
                StatusCodes.Status400BadRequest,
                new RespuestaError("El cuerpo de la petición no es válido", CampoDelJson(ji))),

            JsonException j => (
                StatusCodes.Status400BadRequest,
                new RespuestaError("El cuerpo de la petición no es válido", CampoDelJson(j))),

            BadHttpRequestException => (
                StatusCodes.Status400BadRequest,
                new RespuestaError("El cuerpo de la petición no es válido")),

            // El dominio la lanza cuando alguien intenta devolver un reporte a un estado anterior.
            InvalidOperationException e => (
                StatusCodes.Status400BadRequest,
                new RespuestaError(e.Message)),

            CredencialesInvalidasException e => (
                StatusCodes.Status401Unauthorized,
                new RespuestaError(e.Message)),

            UnauthorizedAccessException => (
                StatusCodes.Status403Forbidden,
                new RespuestaError("No tiene permiso para realizar esta acción")),

            KeyNotFoundException e => (
                StatusCodes.Status404NotFound,
                new RespuestaError(e.Message)),

            _ => (
                StatusCodes.Status500InternalServerError,
                new RespuestaError("Ocurrió un error inesperado"))
        };

        if (estado == StatusCodes.Status500InternalServerError)
        {
            logger.LogError(exception, "Error no controlado en {Ruta}", httpContext.Request.Path);
        }

        httpContext.Response.StatusCode = estado;
        await httpContext.Response.WriteAsJsonAsync(respuesta, cancellationToken);
        return true;
    }

    /// <summary>FluentValidation reporta "Descripcion"; el contrato dice "descripcion".</summary>
    /// <summary>Nombre del campo que rompió la deserialización, tal como lo ve el cliente.</summary>
    private static Dictionary<string, string> CampoDelJson(JsonException j)
    {
        string campo = string.IsNullOrWhiteSpace(j.Path)
            ? "cuerpo"
            : ACamelCase(j.Path.TrimStart('$', '.'));

        return new Dictionary<string, string> { [campo] = "Valor no admitido para este campo" };
    }

    private static string ACamelCase(string propiedad) =>
        string.IsNullOrEmpty(propiedad)
            ? propiedad
            : char.ToLowerInvariant(propiedad[0]) + propiedad[1..];
}
