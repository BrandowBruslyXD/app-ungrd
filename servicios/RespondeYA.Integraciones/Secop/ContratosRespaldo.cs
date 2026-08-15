using RespondeYA.Integraciones.Modelos;

namespace RespondeYA.Integraciones.Secop;

/// <summary>
/// Datos de respaldo para cuando SECOP no responde.
///
/// ⚠️ ADVERTENCIA IMPORTANTE PARA EL EQUIPO ⚠️
///
/// Estos NO son contratos reales. Son ejemplos representativos, con la forma
/// y los órdenes de magnitud típicos de la contratación de prevención del
/// riesgo en Colombia, pero NO corresponden a contratos verificables.
///
/// Existen por un motivo concreto: el 15 de agosto de 2026, durante el
/// desarrollo, datos.gov.co estuvo devolviendo 503 de forma sostenida. Si eso
/// pasa en mitad de la demo, la pantalla de seguimiento se queda sin su bloque
/// más llamativo.
///
/// REGLAS DE USO, INNEGOCIABLES:
///
/// 1. El servicio SIEMPRE intenta primero la API real. El respaldo es el
///    último recurso, nunca el camino por defecto.
/// 2. Cuando se usa el respaldo, la respuesta lo declara con
///    origen = "Respaldo". La interfaz DEBE mostrar un aviso visible.
/// 3. EN EL PITCH HAY QUE DECIRLO. Si el jurado pregunta de dónde salen las
///    cifras y la respuesta es ambigua, se pierde toda la credibilidad que
///    da la integración. Decir "SECOP está caído ahora mismo, esto es un
///    respaldo, aquí está el código que consulta la API real" es una
///    respuesta fuerte. Dejar creer que son reales es hacer trampa.
/// 4. Si consiguen datos reales antes de la demo, reemplacen este archivo
///    con contratos verdaderos descargados de SECOP y anoten la fecha de
///    descarga y el enlace de cada uno.
/// </summary>
public static class ContratosRespaldo
{
    private static readonly Dictionary<string, ContratoPublico[]> PorMunicipio = new(StringComparer.OrdinalIgnoreCase)
    {
        ["BOGOTA"] =
        [
            new("Obras de canalización y mitigación del riesgo en la quebrada Limas, localidad Ciudad Bolívar",
                4_850_000_000m, 2024, "Alcaldía Mayor de Bogotá D.C."),
            new("Mantenimiento preventivo del sistema de alcantarillado pluvial en zonas de riesgo por inundación",
                2_310_000_000m, 2024, "Empresa de Acueducto y Alcantarillado de Bogotá"),
            new("Construcción de obras de contención en laderas con riesgo de remoción en masa",
                1_720_000_000m, 2023, "Instituto Distrital de Gestión de Riesgos"),
        ],

        ["MEDELL"] =
        [
            new("Obras de estabilización de taludes en zonas de alto riesgo por deslizamiento",
                3_450_000_000m, 2024, "Alcaldía de Medellín"),
            new("Sistema de alerta temprana por crecientes súbitas en quebradas urbanas",
                890_000_000m, 2023, "Departamento Administrativo de Gestión del Riesgo"),
        ],

        ["CALI"] =
        [
            new("Dragado y limpieza de canales para prevención de inundaciones en la comuna 21",
                1_980_000_000m, 2024, "Alcaldía de Santiago de Cali"),
            new("Fortalecimiento del cuerpo de bomberos y equipos de atención de emergencias",
                1_240_000_000m, 2023, "Secretaría de Gestión del Riesgo de Cali"),
        ],

        ["MOCOA"] =
        [
            new("Obras de mitigación en la cuenca de los ríos Mulato, Sangoyaco y Taruca",
                12_400_000_000m, 2023, "Alcaldía de Mocoa"),
            new("Sistema de monitoreo y alerta temprana por avenidas torrenciales",
                760_000_000m, 2024, "Corporación para el Desarrollo Sostenible del Sur de la Amazonia"),
        ]
    };

    /// <summary>
    /// Contratos genéricos para municipios que no están en la lista.
    /// Se usan para que la demo funcione en cualquier ubicación.
    /// </summary>
    private static readonly ContratoPublico[] Genericos =
    [
        new("Mantenimiento de obras de drenaje y prevención de inundaciones",
            980_000_000m, 2024, "Alcaldía municipal"),
        new("Fortalecimiento del consejo municipal de gestión del riesgo de desastres",
            340_000_000m, 2023, "Unidad Nacional para la Gestión del Riesgo de Desastres"),
    ];

    public static IReadOnlyList<ContratoPublico> Para(string municipio)
    {
        if (string.IsNullOrWhiteSpace(municipio)) return Genericos;

        // Se compara por prefijo para no depender de tildes ni de la
        // escritura exacta ("Bogotá", "BOGOTA", "Bogotá D.C.").
        foreach (var (llave, contratos) in PorMunicipio)
        {
            if (municipio.StartsWith(llave[..Math.Min(5, llave.Length)], StringComparison.OrdinalIgnoreCase))
                return contratos;
        }

        return Genericos;
    }
}
