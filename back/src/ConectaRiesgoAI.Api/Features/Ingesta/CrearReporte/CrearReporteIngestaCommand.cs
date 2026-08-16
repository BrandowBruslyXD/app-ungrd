using ConectaRiesgoAI.Api.Domain.Enums;
using MediatR;

namespace ConectaRiesgoAI.Api.Features.Ingesta.CrearReporte;

/// <summary>Petición de <c>POST /api/ingesta/reportes</c> (ver docs/INTEGRACION-BOT-BACKEND.md, sección 3.1).</summary>
/// <param name="Canal">
/// Por dónde entró: <c>WhatsApp</c> o <c>Telefono</c>. Es opcional y cae en WhatsApp cuando no
/// viene, porque el bot ya en producción no lo manda y dejarlo obligatorio lo habría roto.
/// El agente telefónico sí lo envía: sin este campo toda llamada quedaba registrada como
/// WhatsApp y el tablero no podía distinguir de dónde venía cada reporte.
/// </param>
public record CrearReporteIngestaCommand(
    string Telefono,
    string? NombreContacto,
    string Clase,
    TipoReporte Tipo,
    string Descripcion,
    string? UbicacionTexto,
    string? NivelDano,
    string? Necesidad,
    string? UrlFoto,
    CanalOrigen? Canal = null) : IRequest<CrearReporteIngestaResponse>;
