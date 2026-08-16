namespace ConectaRiesgoAI.Api.Domain.Enums;

/// <summary>
/// Qué es la foto que se sube. Determina a qué contenedor de Azure Blob Storage va
/// (ver <see cref="Integrations.Storage.Contenedor"/>) y está descrito en MODELO-DATOS.md
/// bajo la entidad Evidencia.
/// </summary>
public enum TipoEvidencia
{
    /// <summary>Foto de un daño material de un reporte ciudadano. Va a "evidencias".</summary>
    DanoMaterial,

    /// <summary>Documento de identidad, cara frontal. Va a "censo". Dato sensible.</summary>
    DocumentoFrontal,

    /// <summary>Documento de identidad, cara posterior. Va a "censo". Dato sensible.</summary>
    DocumentoPosterior,

    /// <summary>Foto de rostro. Va a "censo". Dato biométrico.</summary>
    Rostro,

    /// <summary>Foto del núcleo familiar. Va a "censo".</summary>
    NucleoFamiliar,

    /// <summary>Cualquier otra evidencia de un reporte ciudadano. Va a "evidencias".</summary>
    Otro
}
