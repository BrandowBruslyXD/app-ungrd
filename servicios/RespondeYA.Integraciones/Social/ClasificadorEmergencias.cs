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
    private static readonly Dictionary<string, string[]> PalabrasPorTipo = new()
    {
        [TiposEmergencia.Incendio] =
            ["INCENDIO", "QUEMA", "FUEGO", "CONFLAGRACION", "LLAMAS", "ARDE", "HUMO"],

        [TiposEmergencia.Inundacion] =
            ["INUNDACION", "INUNDADO", "DESBORDAMIENTO", "DESBORDO", "CRECIENTE",
             "ARROYO", "AGUAS", "ANEGADO", "LLUVIAS"],

        [TiposEmergencia.Deslizamiento] =
            ["DESLIZAMIENTO", "DERRUMBE", "REMOCION EN MASA", "ALUD", "SE VINO LA MONTANA",
             "TALUD", "AVALANCHA"],

        [TiposEmergencia.ViaAfectada] =
            ["VIA CERRADA", "VIA AFECTADA", "CIERRE VIAL", "PASO CERRADO",
             "CARRETERA", "PUENTE", "INTRANSITABLE", "COLAPSO DE LA VIA"],

        [TiposEmergencia.ColapsoEstructural] =
            ["COLAPSO", "SE CAYO LA CASA", "DERRUMBO LA VIVIENDA", "EDIFICIO",
             "ESTRUCTURA", "MURO CAIDO"]
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
            var puntaje = palabras.Count(limpio.Contains);
            if (puntaje > mejorPuntaje)
            {
                mejorPuntaje = puntaje;
                mejorTipo = tipo;
            }
        }

        var municipio = Municipios.FirstOrDefault(limpio.Contains);

        // Relevancia de 0 a 100: cuántas señales coinciden.
        // Mencionar un municipio conocido sube mucho la confianza.
        var relevancia = Math.Min(100, mejorPuntaje * 30 + (municipio is not null ? 40 : 0));

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
