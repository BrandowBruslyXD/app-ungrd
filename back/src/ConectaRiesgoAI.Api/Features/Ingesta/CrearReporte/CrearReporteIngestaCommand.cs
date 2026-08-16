using ConectaRiesgoAI.Api.Domain.Enums;
using MediatR;

namespace ConectaRiesgoAI.Api.Features.Ingesta.CrearReporte;

/// <summary>Petición de <c>POST /api/ingesta/reportes</c> (ver docs/INTEGRACION-BOT-BACKEND.md, sección 3.1).</summary>
public record CrearReporteIngestaCommand(
    string Telefono,
    string? NombreContacto,
    string Clase,
    TipoReporte Tipo,
    string Descripcion,
    string? UbicacionTexto,
    string? NivelDano,
    string? Necesidad,
    string? UrlFoto) : IRequest<CrearReporteIngestaResponse>;
