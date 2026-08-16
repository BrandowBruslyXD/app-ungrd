namespace ConectaRiesgoAI.Api.Domain.Enums;

/// <summary>
/// Roles del sistema. Se serializan como texto, no como número (ver CONTRATO-API.md).
/// </summary>
public enum Rol
{
    Ciudadano,
    Gestor,
    Admin
}
