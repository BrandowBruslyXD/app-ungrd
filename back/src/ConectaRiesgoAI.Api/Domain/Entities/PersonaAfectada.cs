using ConectaRiesgoAI.Api.Domain.Enums;

namespace ConectaRiesgoAI.Api.Domain.Entities;

/// <summary>
/// El registro de damnificado que captura el brigadista. Contiene datos personales sensibles
/// bajo la Ley 1581 de 2012 (documento, salud, menores a cargo): nunca se persiste sin
/// <see cref="ConsentimientoDatos"/> en <c>true</c> (ver docs/MODELO-DATOS.md, sección 4).
/// </summary>
public class PersonaAfectada
{
    public int Id { get; set; }

    /// <summary>Identificador público, con formato <c>DMN-2026-08-15-0031</c>.</summary>
    public string Codigo { get; set; } = null!;

    /// <summary>A qué emergencia pertenece. Puede no venir de un reporte previo.</summary>
    public int? ReporteId { get; set; }
    public Reporte? Reporte { get; set; }

    public int OperacionCensoId { get; set; }
    public OperacionCenso OperacionCenso { get; set; } = null!;

    /// <summary>El brigadista que hizo el registro.</summary>
    public int RegistradoPorId { get; set; }
    public Usuario RegistradoPor { get; set; } = null!;

    public string Nombres { get; set; } = null!;
    public string Apellidos { get; set; } = null!;
    public TipoDocumentoPersona TipoDocumento { get; set; }

    /// <summary>Opcional: en una emergencia se pierden los documentos.</summary>
    public string? NumeroDocumento { get; set; }

    public int Edad { get; set; }
    public GeneroPersona Genero { get; set; }
    public string? Telefono { get; set; }
    public string? TelefonoAlterno { get; set; }
    public string? Email { get; set; }

    public string Departamento { get; set; } = null!;
    public string Ciudad { get; set; } = null!;
    public string? Comuna { get; set; }
    public string DireccionResidencia { get; set; } = null!;
    public double? Latitud { get; set; }
    public double? Longitud { get; set; }

    /// <summary>Distingue damnificado local de población flotante.</summary>
    public bool EsResidenteDelMunicipio { get; set; } = true;

    public bool EsCabezaDeHogar { get; set; }
    public bool TieneDiscapacidad { get; set; }
    public bool EsAdultoMayor { get; set; }
    public bool EstaEmbarazada { get; set; }
    public GrupoEtnico? PerteneceGrupoEtnico { get; set; }
    public bool EsVictimaConflicto { get; set; }
    public bool RequiereAtencionMedica { get; set; }
    public string? ObservacionesSalud { get; set; }

    public bool DeclaracionVeracidad { get; set; }
    public DateTime? FechaDeclaracion { get; set; }

    /// <summary>Obligatorio por Ley 1581. Autoriza el tratamiento de sus datos.</summary>
    public bool ConsentimientoDatos { get; set; }

    public EstadoPersonaAfectada Estado { get; set; } = EstadoPersonaAfectada.Borrador;

    public DateTime CreadoEn { get; set; } = DateTime.UtcNow;

    /// <summary>Separado de <see cref="CreadoEn"/> para saber si se capturó sin señal y se sincronizó después.</summary>
    public DateTime? SincronizadoEn { get; set; }

    public ICollection<MiembroNucleoFamiliar> NucleoFamiliar { get; set; } = new List<MiembroNucleoFamiliar>();
    public ICollection<DanoRegistrado> Danos { get; set; } = new List<DanoRegistrado>();

    /// <summary>
    /// Arma el código público del registro. El consecutivo lo calcula quien lo crea, normalmente
    /// contando los del día; la entidad solo le da formato.
    /// </summary>
    public static string GenerarCodigo(DateTime fechaUtc, int consecutivo) =>
        $"DMN-{fechaUtc:yyyy-MM-dd}-{consecutivo:D4}";
}
