using ConectaRiesgoAI.Api.Domain.Entities;
using ConectaRiesgoAI.Api.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ConectaRiesgoAI.Api.Features.Reportes.ObtenerReporte;

/// <summary>Detalle completo de un reporte: cronología, verificación satelital y transparencia.</summary>
public class ObtenerReporteHandler(AppDbContext context)
    : IRequestHandler<ObtenerReporteQuery, ObtenerReporteResponse>
{
    /// <exception cref="KeyNotFoundException">No existe un reporte con ese código; el manejador global lo traduce a 404.</exception>
    public async Task<ObtenerReporteResponse> Handle(ObtenerReporteQuery query, CancellationToken cancellationToken)
    {
        Reporte reporte = await context.Reportes
            .AsNoTracking()
            .Include(r => r.Usuario)
            .Include(r => r.Cronologia)
            .Include(r => r.VerificacionesSatelitales)
            .FirstOrDefaultAsync(r => r.Codigo == query.Codigo, cancellationToken)
            ?? throw new KeyNotFoundException($"No existe un reporte con el código '{query.Codigo}'");

        VerificacionSatelital? verificacion = reporte.VerificacionesSatelitales
            .OrderByDescending(v => v.ConsultadoEn)
            .FirstOrDefault();

        return new ObtenerReporteResponse(
            reporte.Codigo,
            reporte.Tipo,
            reporte.Descripcion,
            reporte.Latitud,
            reporte.Longitud,
            reporte.Direccion,
            reporte.Municipio,
            reporte.UrlFoto,
            reporte.Estado,
            reporte.Prioridad,
            reporte.CreadoEn,
            AbreviarNombre(reporte.Usuario.Nombre),
            reporte.Cronologia
                .OrderBy(e => e.Fecha)
                .Select(e => new EventoCronologiaResponse(e.Estado, e.Nota, e.Fecha, e.Responsable))
                .ToList(),
            verificacion is null
                ? null
                : new VerificacionSatelitalResponse(
                    verificacion.Fuente, verificacion.Confirmado, verificacion.Detalle, verificacion.ConsultadoEn),
            []);
    }

    /// <summary>
    /// Nombre de pila + inicial del apellido. Este endpoint es público: mostrar el nombre
    /// completo del ciudadano expondría más de lo necesario (ver CLAUDE.md, mínima recolección).
    /// </summary>
    private static string AbreviarNombre(string nombreCompleto)
    {
        string[] partes = nombreCompleto.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return partes.Length switch
        {
            0 => nombreCompleto,
            1 => partes[0],
            _ => $"{partes[0]} {partes[^1][0]}."
        };
    }
}
