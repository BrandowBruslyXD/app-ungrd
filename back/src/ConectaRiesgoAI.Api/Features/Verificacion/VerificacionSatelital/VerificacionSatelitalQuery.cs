using MediatR;

namespace ConectaRiesgoAI.Api.Features.Verificacion.VerificacionSatelital;

/// <summary>
/// Consulta directa a NASA FIRMS por lat/lng/radio, sin ligarla a ningún reporte. Sirve para
/// probar la integración por separado (CONTRATO-API.md, sección 4).
/// </summary>
public record VerificacionSatelitalQuery(double Lat, double Lng, double RadioKm) : IRequest<VerificacionSatelitalResponse?>;
