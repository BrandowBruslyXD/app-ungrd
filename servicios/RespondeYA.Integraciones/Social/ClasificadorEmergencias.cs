using System.Globalization;
using System.Text;
using RespondeYA.Integraciones.Modelos;

namespace RespondeYA.Integraciones.Social;

/// <summary>
/// Convierte un texto suelto de redes sociales en un tipo de emergencia y un
/// municipio. Es deliberadamente simple: palabras clave y conteo de coincidencias.
///
/// POR QUÉ NO UN MODELO DE IA: en 20 horas, un clasificador por palabras clave
/// se escribe en 30 minutos, se depura leyéndolo y nunca falla por cuota agotada
/// ni por latencia. Si sobra tiempo al final, este es un buen punto para enchufar
/// un modelo de lenguaje sin tocar nada más: la interfaz ya está aislada.
/// </summary>
public static class ClasificadorEmergencias
{
    /// <summary>
    /// Palabras que identifican cada tipo, con su peso.
    ///
    /// El peso importa: "lluvias" acompaña a casi cualquier emergencia, mientras
    /// que "colapsó" solo aparece en un derrumbe de estructura. Sin pesos, un
    /// texto como "colapsó una casa tras las lluvias" empataba a 1-1 y ganaba
    /// el tipo que estuviera primero en el diccionario, que es puro azar.
    ///
    ///   Peso 3 → inequívoca: nombra la emergencia por su nombre
    ///   Peso 2 → fuerte: casi siempre indica ese tipo
    ///   Peso 1 → contextual: acompaña, pero por sí sola no decide
    /// </summary>
    private static readonly Dictionary<string, (string Palabra, int Peso)[]> PalabrasPorTipo = new()
    {
        [TiposEmergencia.Incendio] =
        [
            ("INCENDIO", 3), ("CONFLAGRACION", 3),
            ("LLAMAS", 2), ("QUEMA", 2), ("ARDE", 2), ("FUEGO", 2),
            ("HUMO", 1)
        ],

        [TiposEmergencia.Inundacion] =
        [
            ("INUNDACION", 3), ("INUNDADO", 3), ("INUNDADA", 3), ("ANEGADO", 3),
            ("DESBORDAMIENTO", 2), ("DESBORDO", 2), ("CRECIENTE", 2),
            ("ARROYO", 1), ("AGUAS", 1), ("LLUVIAS", 1)
        ],

        [TiposEmergencia.Deslizamiento] =
        [
            ("DESLIZAMIENTO", 3), ("REMOCION EN MASA", 3), ("DERRUMBE", 3),
            ("ALUD", 3), ("AVALANCHA", 3),
            ("SE VINO LA MONTANA", 2), ("TALUD", 2)
        ],

        [TiposEmergencia.ViaAfectada] =
        [
            ("VIA CERRADA", 3), ("VIA AFECTADA", 3), ("CIERRE VIAL", 3),
            ("COLAPSO DE LA VIA", 3), ("INTRANSITABLE", 3),
            ("PASO CERRADO", 2), ("PUENTE CAIDO", 2),
            ("CARRETERA", 1), ("PUENTE", 1)
        ],

        [TiposEmergencia.ColapsoEstructural] =
        [
            ("COLAPSO ESTRUCTURAL", 3), ("SE CAYO LA CASA", 3),
            ("DERRUMBO LA VIVIENDA", 3), ("MURO CAIDO", 3),
            ("COLAPSO", 2), ("COLAPSADO", 2), ("SE DERRUMBO", 2),
            ("EDIFICIO", 1), ("ESTRUCTURA", 1), ("VIVIENDA", 1)
        ]
    };

    /// <summary>
    /// Municipios que se monitorean. Lista corta a propósito: para la demo importa
    /// acertar en unas pocas ciudades, no cubrir los 1.100 municipios del país.
    /// </summary>
    private static readonly string[] Municipios =
    [
        "BOGOTA", "MEDELLIN", "CALI", "BARRANQUILLA", "CARTAGENA", "CUCUTA",
        "BUCARAMANGA", "PEREIRA", "SANTA MARTA", "IBAGUE", "MANIZALES",
        "VILLAVICENCIO", "PASTO", "NEIVA", "ARMENIA", "POPAYAN", "MONTERIA",
        "SINCELEJO", "VALLEDUPAR", "QUIBDO", "MOCOA", "FLORENCIA", "TUNJA"
    ];

    /// <summary>
    /// Palabras que descartan un texto aunque mencione una emergencia.
    /// Sin esto, la mitad de las señales serían noticias viejas o memes.
    /// </summary>
    private static readonly string[] Descartes =
    [
        "SIMULACRO", "PELICULA", "SERIE", "VIDEOJUEGO", "ANIVERSARIO",
        "HACE ANOS", "RECUERDA", "EN 2019", "EN 2020", "EN 2021"
    ];

    public static (string Tipo, string? Municipio, int Relevancia) Clasificar(string texto)
    {
        var limpio = Normalizar(texto);

        if (Descartes.Any(limpio.Contains))
            return (TiposEmergencia.Otro, null, 0);

        var mejorTipo = TiposEmergencia.Otro;
        var mejorPuntaje = 0;

        foreach (var (tipo, palabras) in PalabrasPorTipo)
        {
            // Suma de pesos, no conteo: una palabra inequívoca vale más que
            // tres palabras contextuales.
            var puntaje = palabras
                .Where(p => limpio.Contains(p.Palabra))
                .Sum(p => p.Peso);

            if (puntaje > mejorPuntaje)
            {
                mejorPuntaje = puntaje;
                mejorTipo = tipo;
            }
        }

        // Un solo término contextual (peso 1) no basta para afirmar un tipo:
        // "lluvias" o "carretera" por sí solos no describen una emergencia.
        if (mejorPuntaje < 2)
            return (TiposEmergencia.Otro, null, 0);

        var municipio = Municipios.FirstOrDefault(limpio.Contains);

        // Relevancia de 0 a 100. Mencionar un municipio conocido sube mucho la
        // confianza: sin ubicación, la señal no se puede convertir en reporte.
        var relevancia = Math.Min(100, mejorPuntaje * 20 + (municipio is not null ? 40 : 0));

        return (mejorTipo, municipio is null ? null : CapitalizarMunicipio(municipio), relevancia);
    }

    /// <summary>
    /// Términos de búsqueda para las redes sociales. Se mandan con tildes porque
    /// así los escribe la gente, pero el clasificador compara sin ellas.
    /// </summary>
    public static IReadOnlyList<string> TerminosDeBusqueda() =>
    [
        "inundación Colombia",
        "deslizamiento vía",
        "incendio forestal Colombia",
        "emergencia derrumbe",
        "creciente río Colombia"
    ];

    private static string Normalizar(string texto)
    {
        var descompuesto = texto.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(descompuesto.Length);

        foreach (var c in descompuesto)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                sb.Append(char.ToUpperInvariant(c));
        }

        return sb.ToString();
    }

    private static string CapitalizarMunicipio(string enMayuscula) =>
        CultureInfo.GetCultureInfo("es-CO").TextInfo.ToTitleCase(enMayuscula.ToLowerInvariant());
}
