using ConectaRiesgoAI.Api.Domain.Enums;
using MediatR;

namespace ConectaRiesgoAI.Api.Features.Reportes.CrearReporte;

/// <param name="UsuarioId">
/// El endpoint lo completa con el usuario del token después de deserializar el cuerpo:
/// el identificador del solicitante nunca sale del cliente (ver CLAUDE.md, sección Seguridad).
/// </param>
public record CrearReporteCommand(
    TipoReporte Tipo,
    string Descripcion,
    double Latitud,
    double Longitud,
    string? Direccion,
    string Municipio,
    string? UrlFoto,
    int UsuarioId = 0) : IRequest<CrearReporteResponse>;
