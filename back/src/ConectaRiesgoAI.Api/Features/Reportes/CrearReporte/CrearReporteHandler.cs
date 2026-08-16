using ConectaRiesgoAI.Api.Domain.Entities;
using ConectaRiesgoAI.Api.Domain.Enums;
using ConectaRiesgoAI.Api.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ConectaRiesgoAI.Api.Features.Reportes.CrearReporte;

public class CrearReporteHandler(AppDbContext context)
    : IRequestHandler<CrearReporteCommand, CrearReporteResponse>
{
    public async Task<CrearReporteResponse> Handle(CrearReporteCommand command, CancellationToken cancellationToken)
    {
        var ahora = DateTime.UtcNow;

        // El consecutivo cuenta los reportes del día; ver Reporte.GenerarCodigo.
        var consecutivoDelDia = await context.Reportes
            .CountAsync(r => r.CreadoEn.Date == ahora.Date, cancellationToken) + 1;

        var reporte = new Reporte
        {
            Codigo = Reporte.GenerarCodigo(ahora, consecutivoDelDia),
            Tipo = command.Tipo,
            Descripcion = command.Descripcion,
            Latitud = command.Latitud,
            Longitud = command.Longitud,
            Direccion = command.Direccion,
            Municipio = command.Municipio,
            UrlFoto = command.UrlFoto,
            UsuarioId = command.UsuarioId,
            CreadoEn = ahora,
            ActualizadoEn = ahora
        };

        reporte.Cronologia.Add(new EventoCronologia
        {
            Estado = EstadoReporte.Reportado,
            Nota = "Reporte recibido",
            Responsable = "Sistema",
            Fecha = ahora
        });

        context.Reportes.Add(reporte);
        await context.SaveChangesAsync(cancellationToken);

        return new CrearReporteResponse(reporte.Codigo, reporte.Estado, reporte.CreadoEn);
    }
}
