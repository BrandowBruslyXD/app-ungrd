using ConectaRiesgoAI.Api.Domain.Enums;
using ConectaRiesgoAI.Api.Integrations.Storage;
using MediatR;

namespace ConectaRiesgoAI.Api.Features.Evidencias.SubirEvidencia;

public class SubirEvidenciaHandler(IAlmacenamientoDeArchivos almacenamiento)
    : IRequestHandler<SubirEvidenciaCommand, SubirEvidenciaResponse>
{
    public async Task<SubirEvidenciaResponse> Handle(
        SubirEvidenciaCommand request, CancellationToken cancellationToken)
    {
        var resultado = await almacenamiento.SubirAsync(
            AContenedor(request.Tipo), request.Contenido, request.TipoContenido, cancellationToken);

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
