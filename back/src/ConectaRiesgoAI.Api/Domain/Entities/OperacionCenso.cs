namespace ConectaRiesgoAI.Api.Domain.Entities;

/// <summary>
/// Jornada de censo del brigadista: agrupa las <see cref="PersonaAfectada"/> registradas por un
/// mismo brigadista en un mismo municipio. Completa la jerarquía del RUD sobre las tablas que ya
/// existían (<see cref="PersonaAfectada"/>, <see cref="MiembroNucleoFamiliar"/>,
/// <see cref="DanoRegistrado"/>) sin duplicar ningún modelo (ver issue #48).
/// </summary>
/// <remarks>
/// <see cref="CerradaEn"/> existe en el modelo pero ningún caso de uso la asigna todavía: el
/// issue #48 solo cubre abrir/reutilizar la jornada al recibir un registro del bot, no cerrarla.
/// Hasta que exista ese caso de uso, un brigadista que vuelva a registrar en el mismo municipio
/// días después cae en la misma operación abierta — el corte "por día" de este comentario es la
/// intención, no una garantía que el código ya cumpla.
/// </remarks>
public class OperacionCenso
{
    public int Id { get; set; }

    /// <summary>Identificador público, con formato <c>CEN-2026-08-16-0001-K7M2</c> (sufijo no adivinable).</summary>
    public string Codigo { get; set; } = null!;

    public string Municipio { get; set; } = null!;
    public string? BarrioVereda { get; set; }

    /// <summary>El brigadista que la abrió. Debe tener <see cref="Usuario.EsAcreditadoCenso"/> en <c>true</c>.</summary>
    public int BrigadistaId { get; set; }
    public Usuario Brigadista { get; set; } = null!;

    public DateTime AbiertaEn { get; set; } = DateTime.UtcNow;

    /// <summary>Nula mientras la jornada sigue recibiendo registros.</summary>
    public DateTime? CerradaEn { get; set; }

    public ICollection<PersonaAfectada> PersonasAfectadas { get; set; } = new List<PersonaAfectada>();

    /// <summary>
    /// Arma el código público de la operación. El consecutivo lo calcula quien la crea, contando
    /// las del día; la entidad solo le da formato.
    /// </summary>
    public static string GenerarCodigo(DateTime fechaUtc, int consecutivo) =>
        $"CEN-{fechaUtc:yyyy-MM-dd}-{consecutivo:D4}-{Guid.NewGuid().ToString("N")[..4].ToUpperInvariant()}";
}
