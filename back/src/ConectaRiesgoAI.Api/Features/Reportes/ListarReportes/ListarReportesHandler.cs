using ConectaRiesgoAI.Api.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ConectaRiesgoAI.Api.Features.Reportes.ListarReportes;

/// <summary>Lista reportes con filtros de tipo, estado, municipio y radio (Haversine, sin PostGIS).</summary>
public class ListarReportesHandler(AppDbContext context)
    : IRequestHandler<ListarReportesQuery, List<ReporteResumenResponse>>
{
    private const int LimiteDefecto = 100;
    private const double RadioTierraKm = 6371;

    /// <summary>
    /// Filtra tipo/estado/municipio en SQL; el radio se calcula en memoria porque Haversine no
    /// se traduce a SQL sin PostGIS. Con el volumen de un hackatón no hace falta empujarlo a la
    /// base de datos.
    /// </summary>
    public async Task<List<ReporteResumenResponse>> Handle(ListarReportesQuery query, CancellationToken cancellationToken)
    {
        var reportes = await context.Reportes
            .AsNoTracking()
            .Where(r => query.Tipo == null || r.Tipo == query.Tipo)
            .Where(r => query.Estado == null || r.Estado == query.Estado)
            .Where(r => query.Municipio == null || EF.Functions.ILike(r.Municipio, query.Municipio))
            .ToListAsync(cancellationToken);

        var tieneUbicacion = query.Lat is not null && query.Lng is not null;

        var conDistancia = reportes.Select(r => (
            Reporte: r,
            DistanciaKm: tieneUbicacion
                ? Math.Round(CalcularDistanciaKm(query.Lat!.Value, query.Lng!.Value, r.Latitud, r.Longitud), 1)
                : (double?)null));

        if (tieneUbicacion && query.RadioKm is { } radioKm)
        {
            conDistancia = conDistancia.Where(x => x.DistanciaKm <= radioKm);
        }

        var ordenados = tieneUbicacion
            ? conDistancia.OrderBy(x => x.DistanciaKm)
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
                x.DistanciaKm,
                x.Reporte.CreadoEn))
            .ToList();
    }

    /// <summary>Distancia entre dos puntos GPS (fórmula de Haversine). Sin PostGIS: ver decisión D7.</summary>
    private static double CalcularDistanciaKm(double lat1, double lng1, double lat2, double lng2)
    {
        var dLat = GradosARadianes(lat2 - lat1);
        var dLng = GradosARadianes(lng2 - lng1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
                + Math.Cos(GradosARadianes(lat1)) * Math.Cos(GradosARadianes(lat2))
                * Math.Sin(dLng / 2) * Math.Sin(dLng / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return RadioTierraKm * c;
    }

    private static double GradosARadianes(double grados) => grados * Math.PI / 180;
}
