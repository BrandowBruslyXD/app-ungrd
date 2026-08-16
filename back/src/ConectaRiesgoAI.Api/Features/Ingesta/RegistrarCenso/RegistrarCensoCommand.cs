using ConectaRiesgoAI.Api.Domain.Enums;
using MediatR;

namespace ConectaRiesgoAI.Api.Features.Ingesta.RegistrarCenso;

/// <summary>
/// Petición de <c>POST /api/ingesta/censo</c> (ver docs/INTEGRACION-BOT-BACKEND.md, sección 3.3,
/// y el issue #48). El bot llena una versión reducida del formato EDAN; el brigadista completa
/// el resto después desde el frontend.
/// </summary>
public record RegistrarCensoCommand(
    /// <summary>Teléfono del brigadista que hace el registro. Se verifica contra <c>Usuario.EsAcreditadoCenso</c>.</summary>
    string Telefono,
    string Municipio,
    string? BarrioVereda,

    /// <summary>Obligatorio en <c>true</c> por Ley 1581. En <c>false</c> no se persiste nada.</summary>
    bool Consentimiento,
    bool DeclaracionVeracidad,

    string Nombres,
    string Apellidos,
    TipoDocumentoPersona TipoDocumento,
    string? NumeroDocumento,
    int Edad,
    GeneroPersona Genero,
    string? TelefonoContacto,

    string Departamento,
    string Ciudad,
    string DireccionResidencia,
    double? Latitud,
    double? Longitud,

    bool EsCabezaDeHogar,
    bool TieneDiscapacidad,
    bool EsAdultoMayor,
    bool EstaEmbarazada,
    GrupoEtnico? PerteneceGrupoEtnico,
    bool EsVictimaConflicto,
    bool RequiereAtencionMedica,

    /// <summary>Texto libre tal como lo manda el bot (p. ej. "Averiada — NO habitable"). No se mapea a un enum: ver issue #48.</summary>
    string? EstadoVivienda,

    /// <summary>Texto libre, una de las cuatro necesidades del EDAN o la que declare la persona.</summary>
    string? Necesidad,

    IReadOnlyList<MiembroNucleoFamiliarInput>? MiembrosNucleo) : IRequest<RegistrarCensoResponse>;
