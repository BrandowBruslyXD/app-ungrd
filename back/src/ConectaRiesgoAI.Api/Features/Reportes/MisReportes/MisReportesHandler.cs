using ConectaRiesgoAI.Api.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ConectaRiesgoAI.Api.Features.Reportes.MisReportes;

/// <summary>Los reportes del usuario autenticado, más recientes primero.</summary>
public class MisReportesHandler(AppDbContext context)
    : IRequestHandler<MisReportesQuery, List<ReporteResumenResponse>>
{
    public async Task<List<ReporteResumenResponse>> Handle(MisReportesQuery query, CancellationToken cancellationToken) =>
        await context.Reportes
            .AsNoTracking()
            .Where(r => r.UsuarioId == query.UsuarioId)
            .OrderByDescending(r => r.CreadoEn)
            .Select(r => new ReporteResumenResponse(
                r.Codigo,
                r.Tipo,
                r.Descripcion,
                r.Latitud,
                r.Longitud,
                r.Direccion,
                r.Municipio,
                r.UrlFoto,
                r.Estado,
                r.Prioridad,
                null,
                r.CreadoEn))
            .ToListAsync(cancellationToken);
}
