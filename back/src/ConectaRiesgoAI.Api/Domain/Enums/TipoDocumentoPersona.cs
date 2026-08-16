namespace ConectaRiesgoAI.Api.Domain.Enums;

/// <summary>
/// Tipo de documento de identidad de una <see cref="Entities.PersonaAfectada"/> o un
/// <see cref="Entities.MiembroNucleoFamiliar"/>.
/// </summary>
public enum TipoDocumentoPersona
{
    CC,
    TI,
    CE,
    Pasaporte,
    RC,

    /// <summary>
    /// No es un detalle menor: quien perdió la cédula en la emergencia es exactamente quien más
    /// necesita la ayuda. Exigir documento dejaría por fuera a los más afectados.
    /// </summary>
    SinDocumento
}
