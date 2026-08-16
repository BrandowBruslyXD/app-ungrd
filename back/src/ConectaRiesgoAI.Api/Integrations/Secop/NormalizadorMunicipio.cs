using System.Globalization;
using System.Text;

namespace ConectaRiesgoAI.Api.Integrations.Secop;

/// <summary>
/// Normaliza nombres de municipio para comparar de forma consistente en caché, respaldo y
/// consulta real. <c>Reporte.Municipio</c> es texto libre que el ciudadano escribe tal cual
/// (ver docs/MODELO-DATOS.md) — "Bogota" y "Bogotá" deben resolver al mismo contrato pregrabado
/// o a la misma entrada de caché, o el bloque de transparencia desaparece en silencio para el
/// municipio más común de la demo.
/// </summary>
public static class NormalizadorMunicipio
{
    /// <summary>Mayúsculas, sin tildes ni diacríticos, sin espacios en los extremos.</summary>
    public static string Normalizar(string municipio)
    {
        string sinTildes = municipio.Trim()
            .Normalize(NormalizationForm.FormD)
            .Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
            .Aggregate(new StringBuilder(), (sb, c) => sb.Append(c))
            .ToString()
            .Normalize(NormalizationForm.FormC);

        return sinTildes.ToUpperInvariant();
    }
}
