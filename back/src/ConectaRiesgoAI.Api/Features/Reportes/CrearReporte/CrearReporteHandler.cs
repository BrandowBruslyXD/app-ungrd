using ConectaRiesgoAI.Api.Common.Reportes;
using ConectaRiesgoAI.Api.Domain.Entities;
using ConectaRiesgoAI.Api.Domain.Enums;
using ConectaRiesgoAI.Api.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ConectaRiesgoAI.Api.Features.Reportes.CrearReporte;

/// <summary>Crea el reporte y arranca su cronología en <see cref="EstadoReporte.Reportado"/>.</summary>
public class CrearReporteHandler(AppDbContext context, ILogger<CrearReporteHandler> logger)
    : IRequestHandler<CrearReporteCommand, CrearReporteResponse>
{
    private const int MaxIntentos = 5;

    /// <summary>
    /// Genera el <c>Codigo</c> a partir de un <c>COUNT</c> de los reportes del día, sin
    /// transacción. Dos ciudadanos reportando casi al mismo tiempo pueden calcular el mismo
    /// consecutivo; el índice único en <c>Codigo</c> (<see cref="Persistence.Configurations.ReporteConfiguration"/>)
    /// lo detecta y aquí se reintenta en vez de perder el reporte de la emergencia con un 500.
    /// Cada intento suma su propio número al conteo (no solo 1), así que el candidato cambia
    /// aunque el conteo en base de datos siga igual entre reintentos. Solo se reintenta si la
    /// falla fue realmente esa colisión: cualquier otro <see cref="DbUpdateException"/> (por
    /// ejemplo un <c>UsuarioId</c> que ya no existe) se relanza de inmediato en vez de insistir
    /// 5 veces con un insert condenado a fallar igual.
    /// </summary>
    public async Task<CrearReporteResponse> Handle(CrearReporteCommand command, CancellationToken cancellationToken)
    {
        DateTime ahora = DateTime.UtcNow;

        for (int intento = 1; intento <= MaxIntentos; intento++)
        {
            int reportesDeHoy = await ContarReportesDeHoy(ahora, cancellationToken);
            Reporte reporte = ConstruirReporte(command, ahora, reportesDeHoy + intento);

            context.Reportes.Add(reporte);

            try
            {
                await context.SaveChangesAsync(cancellationToken);
                return new CrearReporteResponse(reporte.Codigo, reporte.Estado, reporte.CreadoEn);
            }
            catch (DbUpdateException ex)
            {
                DesvincularDelSeguimiento(reporte);

                if (!await ExisteOtroReporteConEseCodigo(reporte.Codigo, cancellationToken))
                {
                    logger.LogWarning(ex,
                        "No se pudo crear el reporte {Codigo}: el error no fue una colisión del código",
                        reporte.Codigo);
                    throw;
                }
            }
        }

        throw new InvalidOperationException(
            "No se pudo generar un código único para el reporte tras varios reportes simultáneos. Intenta de nuevo.");
    }

    private Task<bool> ExisteOtroReporteConEseCodigo(string codigo, CancellationToken cancellationToken) =>
        context.Reportes.AsNoTracking().AnyAsync(r => r.Codigo == codigo, cancellationToken);

    private async Task<int> ContarReportesDeHoy(DateTime ahora, CancellationToken cancellationToken)
    {
        DateTime inicioDelDia = ahora.Date;
        DateTime inicioDelDiaSiguiente = inicioDelDia.AddDays(1);

        return await context.Reportes
            .CountAsync(r => r.CreadoEn >= inicioDelDia && r.CreadoEn < inicioDelDiaSiguiente, cancellationToken);
    }

    private static Reporte ConstruirReporte(CrearReporteCommand command, DateTime ahora, int consecutivo)
    {
        Reporte reporte = new Reporte
        {
            Codigo = Reporte.GenerarCodigo(ahora, consecutivo),
            Tipo = command.Tipo,
            Descripcion = command.Descripcion,
            Latitud = command.Latitud,
            Longitud = command.Longitud,
            Direccion = command.Direccion,
            Municipio = command.Municipio,
            UrlFoto = command.UrlFoto,
            UsuarioId = command.UsuarioId,
            Canal = CanalOrigen.Web,
            IdentificadorCanal = IdentificadorCanalReporte.ParaWeb(command.UsuarioId),
            ReferenciaExterna = null,
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

        return reporte;
    }

    /// <summary>Saca el reporte fallido (y su cronología) del seguimiento del contexto antes de reintentar.</summary>
    private void DesvincularDelSeguimiento(Reporte reporte)
    {
        // ToList(): desvincular un EventoCronologia dispara el fix-up de relaciones de EF Core
        // sobre la propia colección reporte.Cronologia, así que enumerarla directamente revienta
        // con "Collection was modified" a mitad de la vuelta.
        foreach (EventoCronologia evento in reporte.Cronologia.ToList())
        {
            context.Entry(evento).State = EntityState.Detached;
        }

        context.Entry(reporte).State = EntityState.Detached;
    }
}
