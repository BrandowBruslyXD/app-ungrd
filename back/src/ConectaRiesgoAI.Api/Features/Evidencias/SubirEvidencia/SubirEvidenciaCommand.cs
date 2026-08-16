using ConectaRiesgoAI.Api.Domain.Enums;
using MediatR;

namespace ConectaRiesgoAI.Api.Features.Evidencias.SubirEvidencia;

/// <param name="Tipo">Determina a qué contenedor va (ver <see cref="SubirEvidenciaHandler"/>).</param>
public record SubirEvidenciaCommand(
    TipoEvidencia Tipo,
    string TipoContenido,
    long TamanoBytes,
    Stream Contenido) : IRequest<SubirEvidenciaResponse>;
