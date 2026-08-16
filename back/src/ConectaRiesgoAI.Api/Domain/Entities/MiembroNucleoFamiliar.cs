using ConectaRiesgoAI.Api.Domain.Enums;

namespace ConectaRiesgoAI.Api.Domain.Entities;

/// <summary>
/// Cada persona que depende de la <see cref="PersonaAfectada"/> principal. Puede incluir menores
/// de edad: sus datos tienen protección reforzada bajo la Ley 1581 (ver docs/MODELO-DATOS.md,
/// sección 5).
/// </summary>
public class MiembroNucleoFamiliar
{
    public int Id { get; set; }

    public int PersonaAfectadaId { get; set; }
    public PersonaAfectada PersonaAfectada { get; set; } = null!;

    public string Nombres { get; set; } = null!;
    public string Apellidos { get; set; } = null!;
    public ParentescoFamiliar Parentesco { get; set; }
    public int Edad { get; set; }
    public TipoDocumentoPersona? TipoDocumento { get; set; }
    public string? NumeroDocumento { get; set; }
    public bool TieneDiscapacidad { get; set; }

    /// <summary>Sirve para gestionar cupos escolares.</summary>
    public bool? EstudiaActualmente { get; set; }
}
