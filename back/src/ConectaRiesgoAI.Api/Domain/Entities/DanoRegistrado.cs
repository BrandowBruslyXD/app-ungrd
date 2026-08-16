using ConectaRiesgoAI.Api.Domain.Enums;

namespace ConectaRiesgoAI.Api.Domain.Entities;

/// <summary>Qué perdió una <see cref="PersonaAfectada"/>. Un registro por categoría afectada (ver docs/MODELO-DATOS.md, sección 6).</summary>
public class DanoRegistrado
{
    public int Id { get; set; }

    public int PersonaAfectadaId { get; set; }
    public PersonaAfectada PersonaAfectada { get; set; } = null!;

    public CategoriaDano Categoria { get; set; }
    public NivelDano Nivel { get; set; }

    /// <summary>Solo si <see cref="Categoria"/> es <see cref="CategoriaDano.Vivienda"/>.</summary>
    public TipoInmueble? TipoInmueble { get; set; }

    /// <summary>Propietario o arrendatario.</summary>
    public bool? EsPropietario { get; set; }

    public string? Descripcion { get; set; }
    public decimal? ValorEstimado { get; set; }

    /// <summary>Solo agricultura.</summary>
    public decimal? HectareasAfectadas { get; set; }

    /// <summary>Solo agricultura.</summary>
    public int? AnimalesPerdidos { get; set; }
}
