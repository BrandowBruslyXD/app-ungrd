using ConectaRiesgoAI.Api.Domain.Enums;

namespace ConectaRiesgoAI.Api.Features.Reportes.ActualizarEstado;

/// <summary>Respuesta `200` de <c>PATCH /api/reportes/{codigo}/estado</c> (ver CONTRATO-API.md).</summary>
public record ActualizarEstadoResponse(string Codigo, EstadoReporte Estado, DateTime ActualizadoEn);
