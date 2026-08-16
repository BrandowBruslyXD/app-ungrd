using ConectaRiesgoAI.Api.Common.Geo;
using ConectaRiesgoAI.Api.Domain.Entities;
using ConectaRiesgoAI.Api.Domain.Enums;
using ConectaRiesgoAI.Api.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ConectaRiesgoAI.Api.Features.Estadisticas.ResumenEstadisticas;

/// <summary>
/// Compone en una sola llamada los números resumen del dashboard: conteo por tipo, total de hoy,
/// atendidos, porcentaje atendido y tiempo promedio de atención.
/// </summary>
public class ResumenEstadisticasHandler(AppDbContext context)
    : IRequestHandler<ResumenEstadisticasQuery, ResumenEstadisticasResponse>
{
    /// <summary>
    /// Filtra municipio en SQL; el radio se calcula en memoria porque Haversine no se traduce a
    /// SQL sin PostGIS (mismo enfoque que <c>ListarReportesHandler</c>). "porTipo" y "porCanal" cuentan sobre
    /// todos los reportes filtrados, sin restringir a hoy: reflejan la carga actual por tipo y canal.
    /// "totalHoy"/"atendidos"/"tiempoPromedioMinutos" sí se acotan al día en curso (UTC).
    /// </summary>
    public async Task<ResumenEstadisticasResponse> Handle(ResumenEstadisticasQuery query, CancellationToken cancellationToken)
    {
        List<Reporte> reportes = await context.Reportes
            .AsNoTracking()
            .Where(r => query.Municipio == null || EF.Functions.ILike(r.Municipio, query.Municipio))
            .Include(r => r.Cronologia.Where(e => e.Estado == EstadoReporte.Atendido))
            .ToListAsync(cancellationToken);

        bool tieneUbicacion = query.Lat is not null && query.Lng is not null;
        if (tieneUbicacion)
        {
            reportes = reportes
                .Where(r => GeoCalculos.DistanciaKm(query.Lat!.Value, query.Lng!.Value, r.Latitud, r.Longitud) is { } distanciaKm
                            && (query.RadioKm is null || distanciaKm <= query.RadioKm))
                .ToList();
        }

        Dictionary<string, int> porTipo = Enum.GetValues<TipoReporte>()
            .ToDictionary(t => t.ToString(), _ => 0);
        foreach (Reporte reporte in reportes)
        {
            porTipo[reporte.Tipo.ToString()]++;
        }

        Dictionary<string, int> porCanal = Enum.GetValues<CanalOrigen>()
            .ToDictionary(c => c.ToString(), _ => 0);
        foreach (Reporte reporte in reportes)
        {
            porCanal[reporte.Canal.ToString()]++;
        }

        DateTime hoyUtc = DateTime.UtcNow.Date;
        List<Reporte> reportesDeHoy = reportes.Where(r => r.CreadoEn.Date == hoyUtc).ToList();
        List<Reporte> atendidosDeHoy = reportesDeHoy
            .Where(r => r.Estado is EstadoReporte.Atendido or EstadoReporte.Cerrado)
            .ToList();

        int totalHoy = reportesDeHoy.Count;
        int atendidos = atendidosDeHoy.Count;
        int porcentajeAtendidos = totalHoy == 0 ? 0 : (int)Math.Round(atendidos * 100.0 / totalHoy);

        List<double> minutosDeAtencion = atendidosDeHoy
            .Select(r => (Reporte: r, EventoAtendido: r.Cronologia.FirstOrDefault(e => e.Estado == EstadoReporte.Atendido)))
            .Where(x => x.EventoAtendido is not null)
            .Select(x => (x.EventoAtendido!.Fecha - x.Reporte.CreadoEn).TotalMinutes)
            .ToList();

        return new ResumenEstadisticasResponse(
            porTipo,
            porCanal,
            totalHoy,
            atendidos,
            porcentajeAtendidos,
            minutosDeAtencion.Count == 0 ? 0 : (int)Math.Round(minutosDeAtencion.Average()));
    }
}
