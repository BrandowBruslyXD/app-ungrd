using ConectaRiesgoAI.Api.Domain.Enums;

namespace ConectaRiesgoAI.Api.Features.Reportes.ObtenerReporte;

public record EventoCronologiaResponse(EstadoReporte Estado, string Nota, DateTime Fecha, string Responsable);
