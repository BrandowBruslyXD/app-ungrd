namespace ConectaRiesgoAI.Api.Integrations.Nasa;

/// <summary>Resultado de consultar NASA FIRMS por focos de calor cerca de un punto.</summary>
public record ResultadoVerificacionSatelital(bool Confirmado, int FocosDetectados, double? DistanciaMasCercanaKm, string Detalle);
