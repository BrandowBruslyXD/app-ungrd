using ConectaRiesgoAI.Api.Common.Geo;
using ConectaRiesgoAI.Api.Domain.Entities;
using ConectaRiesgoAI.Api.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ConectaRiesgoAI.Api.Features.Reportes.ListarReportes;

/// <summary>Lista reportes con filtros de tipo, estado, municipio y radio (Haversine, sin PostGIS).</summary>
public class ListarReportesHandler(AppDbContext context)
    : IRequestHandler<ListarReportesQuery, List<ReporteResumenResponse>>
{
    private const int LimiteDefecto = 100;

    /// <summary>
    /// Filtra tipo/estado/municipio en SQL; el radio se calcula en memoria porque Haversine no
    /// se traduce a SQL sin PostGIS. Con el volumen de un hackatón no hace falta empujarlo a la
    /// base de datos.
    /// </summary>
    public async Task<List<ReporteResumenResponse>> Handle(ListarReportesQuery query, CancellationToken cancellationToken)
    {
        List<Reporte> reportes = await context.Reportes
            .AsNoTracking()
            .Where(r => query.Tipo == null || r.Tipo == query.Tipo)
            .Where(r => query.Estado == null || r.Estado == query.Estado)
            .Where(r => query.Canal == null || r.Canal == query.Canal)
            .Where(r => query.Municipio == null || EF.Functions.ILike(r.Municipio, query.Municipio))
            .ToListAsync(cancellationToken);

        bool tieneUbicacion = query.Lat is not null && query.Lng is not null;

        var conDistancia = reportes.Select(r => (
            Reporte: r,
            // Nula cuando el reporte entró por WhatsApp y no tiene GPS: no se puede calcular
            // distancia, así que ese reporte queda fuera de cualquier filtro por radio.
            DistanciaKm: tieneUbicacion && GeoCalculos.DistanciaKm(query.Lat!.Value, query.Lng!.Value, r.Latitud, r.Longitud) is { } distanciaKm
                ? Math.Round(distanciaKm, 1)
                : (double?)null));

        if (tieneUbicacion && query.RadioKm is { } radioKm)
        {
            conDistancia = conDistancia.Where(x => x.DistanciaKm is not null && x.DistanciaKm <= radioKm);
        }

        var ordenados = tieneUbicacion
            ? conDistancia.OrderBy(x => x.DistanciaKm ?? double.MaxValue)
            : conDistancia.OrderByDescending(x => x.Reporte.CreadoEn);

        return ordenados
            .Take(query.Limite ?? LimiteDefecto)
            .Select(x => new ReporteResumenResponse(
                x.Reporte.Codigo,
                x.Reporte.Tipo,
                x.Reporte.Descripcion,
                x.Reporte.Latitud,
                x.Reporte.Longitud,
                x.Reporte.Direccion,
                x.Reporte.Municipio,
                x.Reporte.UrlFoto,
                x.Reporte.Estado,
                x.Reporte.Prioridad,
                x.Reporte.Canal,
                x.DistanciaKm,
                x.Reporte.CreadoEn))
            .ToList();
    }
}
