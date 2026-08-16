using ConectaRiesgoAI.Api.Common.Auth;
using ConectaRiesgoAI.Api.Domain.Enums;
using ConectaRiesgoAI.Api.Integrations.Storage;
using MediatR;

namespace ConectaRiesgoAI.Api.Features.Evidencias.SubirEvidencia;

/// <summary>
/// Sube la evidencia al contenedor que corresponde según <see cref="TipoEvidencia"/> y
/// aplica la única regla de negocio del caso de uso: solo Gestor/Admin puede escribir en
/// "censo", porque ahí va documento de identidad y biometría (Ley 1581).
/// </summary>
public class SubirEvidenciaHandler(IAlmacenamientoDeArchivos almacenamiento, IUsuarioActual usuarioActual)
    : IRequestHandler<SubirEvidenciaCommand, SubirEvidenciaResponse>
{
    /// <inheritdoc />
    public async Task<SubirEvidenciaResponse> Handle(
        SubirEvidenciaCommand request, CancellationToken cancellationToken)
    {
        Contenedor contenedor = AContenedor(request.Tipo);

        // No hay rol "Brigadista" todavía (ver docs/INTEGRACION-BOT-BACKEND.md, sin mergear):
        // Gestor/Admin es la restricción mínima disponible hoy para datos biométricos y de
        // identidad. Un Ciudadano nunca puede escribir en el contenedor censo.
        if (contenedor == Contenedor.Censo && usuarioActual.Rol is not (Rol.Gestor or Rol.Admin))
        {
            throw new UnauthorizedAccessException("Solo un gestor puede subir evidencia del censo.");
        }

        ResultadoSubida resultado = await almacenamiento.SubirAsync(
            contenedor, request.Contenido, request.TipoContenido, cancellationToken);

        return new SubirEvidenciaResponse(
            resultado.Exitoso ? resultado.UrlFirmada : null, resultado.Exitoso);
    }

    /// <summary>
    /// Daño material y "otro" son evidencia de reporte ciudadano; el resto es del censo del
    /// brigadista, con protección reforzada por ser documento de identidad o biometría.
    /// </summary>
    private static Contenedor AContenedor(TipoEvidencia tipo) => tipo switch
    {
        TipoEvidencia.DanoMaterial or TipoEvidencia.Otro => Contenedor.Evidencias,
        TipoEvidencia.DocumentoFrontal or TipoEvidencia.DocumentoPosterior
            or TipoEvidencia.Rostro or TipoEvidencia.NucleoFamiliar => Contenedor.Censo,
        _ => throw new ArgumentOutOfRangeException(nameof(tipo))
    };
}
