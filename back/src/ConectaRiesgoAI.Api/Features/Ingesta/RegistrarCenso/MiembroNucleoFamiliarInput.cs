using ConectaRiesgoAI.Api.Domain.Enums;

namespace ConectaRiesgoAI.Api.Features.Ingesta.RegistrarCenso;

/// <summary>Un integrante del núcleo familiar, tal como lo envía el bot dentro de <see cref="RegistrarCensoCommand"/>.</summary>
public record MiembroNucleoFamiliarInput(
    string Nombres,
    string Apellidos,
    ParentescoFamiliar Parentesco,
    int Edad,
    TipoDocumentoPersona? TipoDocumento,
    string? NumeroDocumento,
    bool TieneDiscapacidad,
    bool? EstudiaActualmente);
