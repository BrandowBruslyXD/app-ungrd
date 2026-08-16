using ConectaRiesgoAI.Api.Common.Auth;
using ConectaRiesgoAI.Api.Domain.Entities;
using ConectaRiesgoAI.Api.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ConectaRiesgoAI.Api.Features.Reportes.ActualizarEstado;

/// <summary>
/// Mueve el reporte al siguiente estado y deja la huella en la cronología: es donde nace lo que
/// el ciudadano ve en su pantalla de seguimiento.
/// </summary>
public class ActualizarEstadoHandler(AppDbContext db, IUsuarioActual usuarioActual, ILogger<ActualizarEstadoHandler> logger)
    : IRequestHandler<ActualizarEstadoCommand, ActualizarEstadoResponse>
{
    public async Task<ActualizarEstadoResponse> Handle(ActualizarEstadoCommand command, CancellationToken cancellationToken)
    {
        Reporte reporte = await db.Reportes.SingleOrDefaultAsync(r => r.Codigo == command.Codigo, cancellationToken)
            ?? throw new KeyNotFoundException($"No existe un reporte con código '{command.Codigo}'");

        string responsable = usuarioActual.Nombre ?? "Sistema";
        if (usuarioActual.Nombre is null)
        {
            // No debería pasar: GeneradorTokenJwt siempre pone el nombre en el token de quien
            // se loguea. Si llega a faltar, mejor dejar rastro que atribuir el cambio en
            // silencio a un "Sistema" que no fue quien realmente lo hizo.
            logger.LogWarning(
                "Token sin claim de nombre al cambiar el estado de {Codigo}; se registra como Sistema", command.Codigo);
        }

        // La validación ya garantizó que Estado no es null.
        reporte.CambiarEstado(command.Estado!.Value, command.Nota, responsable);

        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Reporte {Codigo} pasó a {Estado} por {Responsable}",
            reporte.Codigo, reporte.Estado, responsable);

        return new ActualizarEstadoResponse(reporte.Codigo, reporte.Estado, reporte.ActualizadoEn);
    }
}
