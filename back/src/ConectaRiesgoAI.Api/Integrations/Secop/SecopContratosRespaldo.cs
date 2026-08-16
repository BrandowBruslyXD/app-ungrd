namespace ConectaRiesgoAI.Api.Integrations.Secop;

/// <summary>
/// Datos de respaldo pregrabados para los municipios de la demo. SECOP tiene datos irregulares
/// (nombres de municipio inconsistentes, campos vacíos) y el issue CR-23 pide explícitamente no
/// pelear con eso: si la consulta real falla y <c>UsarRespaldoSiFalla</c> está activo, se usa esto
/// para que la demo nunca se quede sin el bloque de transparencia.
/// </summary>
public static class SecopContratosRespaldo
{
    private static readonly Dictionary<string, IReadOnlyList<ContratoSecop>> Datos = new()
    {
        [NormalizadorMunicipio.Normalizar("Bogotá")] =
        [
            new ContratoSecop("Obras de canalización quebrada La Vieja", 450_000_000m, 2024, "Alcaldía de Bogotá"),
            new ContratoSecop("Mantenimiento de alcantarillado sector norte", 120_000_000m, 2023, "Alcaldía de Bogotá"),
            new ContratoSecop("Obras de contención de talud vía Calle 80", 95_000_000m, 2023, "Alcaldía de Bogotá")
        ],
        [NormalizadorMunicipio.Normalizar("Medellín")] =
        [
            new ContratoSecop("Mitigación de riesgo por deslizamiento Comuna 8", 310_000_000m, 2024, "Alcaldía de Medellín"),
            new ContratoSecop("Gestión del riesgo en laderas urbanas", 180_000_000m, 2023, "Alcaldía de Medellín")
        ],
        [NormalizadorMunicipio.Normalizar("Cali")] =
        [
            new ContratoSecop("Prevención de inundaciones río Cali", 275_000_000m, 2024, "Alcaldía de Cali")
        ]
    };

    /// <summary>Contratos pregrabados del municipio, o lista vacía si no hay datos de respaldo para él.</summary>
    public static IReadOnlyList<ContratoSecop> Para(string municipio) =>
        Datos.TryGetValue(NormalizadorMunicipio.Normalizar(municipio), out IReadOnlyList<ContratoSecop>? contratos)
            ? contratos
            : [];
}
