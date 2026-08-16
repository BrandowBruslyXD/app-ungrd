using ConectaRiesgoAI.Api.Domain.Enums;
using MediatR;

namespace ConectaRiesgoAI.Api.Features.Reportes.ActualizarEstado;

/// <summary>Junta el código de la ruta con el cuerpo de la petición para mandarlo entero al handler.</summary>
public record ActualizarEstadoCommand(string Codigo, EstadoReporte? Estado, string Nota)
    : IRequest<ActualizarEstadoResponse>;
