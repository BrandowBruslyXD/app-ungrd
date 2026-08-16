using ConectaRiesgoAI.Api.Domain.Enums;

namespace ConectaRiesgoAI.Api.Features.Ingesta.RegistrarCenso;

/// <summary>
/// El bot manda <c>estadoVivienda</c> como texto libre con la taxonomía oficial del RUD
/// ("Averiada — NO habitable", "Destruida"...), no como el enum <see cref="NivelDano"/> que ya
/// usa <see cref="DanoRegistrado"/> (ver issue #48: se decidió no tocar ese enum). Esto es una
/// aproximación por palabras clave para dejar el campo obligatorio con un valor razonable; el
/// texto original siempre queda intacto en <see cref="Domain.Entities.DanoRegistrado.Descripcion"/>.
/// </summary>
public static class MapeoNivelDanoVivienda
{
    public static NivelDano Aproximar(string? estadoVivienda)
    {
        string texto = estadoVivienda?.Trim().ToLowerInvariant() ?? string.Empty;

        if (texto.Contains("destr"))
        {
            return NivelDano.DestruccionTotal;
        }

        if (texto.Contains("no habitable") || texto.Contains("nohabitable") || texto.Contains("inhabitable"))
        {
            return NivelDano.Grave;
        }

        if (texto.Contains("averiada") || texto.Contains("leve"))
        {
            return NivelDano.Leve;
        }

        // Sin texto reconocible: Moderado es el punto medio, no un extremo que sobre- o
        // subestime la urgencia del caso mientras el brigadista completa el registro.
        return NivelDano.Moderado;
    }
}
