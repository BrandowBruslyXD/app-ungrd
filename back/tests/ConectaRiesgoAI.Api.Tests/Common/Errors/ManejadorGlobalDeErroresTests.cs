using System.Text.Json;
using ConectaRiesgoAI.Api.Common.Errors;
using FluentValidation;
using FluentValidation.Results;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;

namespace ConectaRiesgoAI.Api.Tests.Common.Errors;

public class ManejadorGlobalDeErroresTests
{
    private static readonly ManejadorGlobalDeErrores Manejador =
        new(NullLogger<ManejadorGlobalDeErrores>.Instance);

    private static async Task<(int Status, JsonElement Cuerpo)> EjecutarAsync(Exception excepcion)
    {
        DefaultHttpContext contexto = new();
        contexto.Request.Path = "/api/prueba";
        contexto.Response.Body = new MemoryStream();

        bool manejado = await Manejador.TryHandleAsync(contexto, excepcion, CancellationToken.None);

        Assert.True(manejado);
        contexto.Response.Body.Seek(0, SeekOrigin.Begin);
        JsonElement cuerpo = await JsonSerializer.DeserializeAsync<JsonElement>(contexto.Response.Body);
        return (contexto.Response.StatusCode, cuerpo);
    }

    [Fact]
    public async Task TryHandleAsync_ValidationException_Devuelve400ConDetallesEnCamelCase()
    {
        ValidationException excepcion = new([
            new ValidationFailure("Descripcion", "La descripción es obligatoria"),
            new ValidationFailure("Municipio", "El municipio es obligatorio")
        ]);

        (int status, JsonElement cuerpo) = await EjecutarAsync(excepcion);

        Assert.Equal(StatusCodes.Status400BadRequest, status);
        Assert.Equal("Datos inválidos", cuerpo.GetProperty("error").GetString());
        Assert.Equal("La descripción es obligatoria", cuerpo.GetProperty("detalles").GetProperty("descripcion").GetString());
    }

    [Fact]
    public async Task TryHandleAsync_InvalidOperationException_Devuelve400ConMensaje()
    {
        (int status, JsonElement cuerpo) = await EjecutarAsync(new InvalidOperationException("Transición inválida"));

        Assert.Equal(StatusCodes.Status400BadRequest, status);
        Assert.Equal("Transición inválida", cuerpo.GetProperty("error").GetString());
    }

    [Fact]
    public async Task TryHandleAsync_CredencialesInvalidas_Devuelve401()
    {
        (int status, JsonElement cuerpo) = await EjecutarAsync(new CredencialesInvalidasException("Correo o contraseña incorrectos"));

        Assert.Equal(StatusCodes.Status401Unauthorized, status);
        Assert.Equal("Correo o contraseña incorrectos", cuerpo.GetProperty("error").GetString());
    }

    [Fact]
    public async Task TryHandleAsync_UnauthorizedAccessException_Devuelve403()
    {
        (int status, JsonElement cuerpo) = await EjecutarAsync(new UnauthorizedAccessException());

        Assert.Equal(StatusCodes.Status403Forbidden, status);
        Assert.Equal("No tiene permiso para realizar esta acción", cuerpo.GetProperty("error").GetString());
    }

    [Fact]
    public async Task TryHandleAsync_KeyNotFoundException_Devuelve404()
    {
        (int status, JsonElement cuerpo) = await EjecutarAsync(new KeyNotFoundException("No existe el reporte"));

        Assert.Equal(StatusCodes.Status404NotFound, status);
        Assert.Equal("No existe el reporte", cuerpo.GetProperty("error").GetString());
    }

    [Fact]
    public async Task TryHandleAsync_ExcepcionDesconocida_Devuelve500SinFiltrarDetalles()
    {
        (int status, JsonElement cuerpo) = await EjecutarAsync(new Exception("detalle interno"));

        Assert.Equal(StatusCodes.Status500InternalServerError, status);
        Assert.Equal("Ocurrió un error inesperado", cuerpo.GetProperty("error").GetString());
        if (cuerpo.TryGetProperty("detalles", out JsonElement detalles))
        {
            Assert.Equal(JsonValueKind.Null, detalles.ValueKind);
        }
    }
}
