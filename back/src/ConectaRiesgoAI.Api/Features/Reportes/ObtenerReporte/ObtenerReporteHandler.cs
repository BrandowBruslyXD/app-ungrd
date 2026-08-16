using ConectaRiesgoAI.Api.Domain.Entities;
using ConectaRiesgoAI.Api.Domain.Enums;
using ConectaRiesgoAI.Api.Integrations.Nasa;
using ConectaRiesgoAI.Api.Integrations.Secop;
using ConectaRiesgoAI.Api.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace ConectaRiesgoAI.Api.Features.Reportes.ObtenerReporte;

/// <summary>Detalle completo de un reporte: cronología, verificación satelital y transparencia.</summary>
public class ObtenerReporteHandler(
    AppDbContext context,
    ISecopClient secopClient,
    INasaFirmsClient nasaFirmsClient,
    IOptions<NasaOptions> opcionesNasa,
    ILogger<ObtenerReporteHandler> logger)
    : IRequestHandler<ObtenerReporteQuery, ObtenerReporteResponse>
{
    private readonly NasaOptions _opcionesNasa = opcionesNasa.Value;

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

        // ISecopClient nunca lanza (ver su contrato): un SECOP caído no puede tumbar esta pantalla.
        IReadOnlyList<ContratoSecop> transparencia = await secopClient.ConsultarPorMunicipioAsync(reporte.Municipio, cancellationToken);

        VerificacionSatelital? verificacion = reporte.VerificacionesSatelitales
            .OrderByDescending(v => v.ConsultadoEn)
            .FirstOrDefault();
        verificacion ??= await VerificarSatelitalmenteSiAplica(reporte, cancellationToken);

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
            reporte.Canal,
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
            transparencia
                .Select(c => new TransparenciaItemResponse(c.Objeto, c.Valor, c.Anio, c.Entidad))
                .ToList());
    }

    /// <summary>
    /// Primera vez que se pide el detalle de un reporte de incendio con coordenadas: consulta
    /// NASA FIRMS y guarda el resultado en <see cref="VerificacionSatelital"/> para no volver a
    /// consultarlo (issue #18). Solo aplica a incendios (ver <c>VerificacionSatelital.cs</c>).
    /// <see cref="INasaFirmsClient"/> nunca lanza, así que un NASA FIRMS caído o sin MAP_KEY solo
    /// deja el bloque satelital en <c>null</c>, sin persistir nada — se reintentará en la
    /// siguiente consulta del reporte.
    /// </summary>
    private async Task<VerificacionSatelital?> VerificarSatelitalmenteSiAplica(Reporte reporte, CancellationToken cancellationToken)
    {
        if (reporte.Tipo != TipoReporte.Incendio || reporte.Latitud is null || reporte.Longitud is null)
        {
            return null;
        }

        ResultadoVerificacionSatelital? resultado = await nasaFirmsClient.ConsultarFocosDeCalorAsync(
            reporte.Latitud.Value, reporte.Longitud.Value, _opcionesNasa.RadioConfirmacionKm, cancellationToken);
        if (resultado is null)
        {
            return null;
        }

        VerificacionSatelital verificacion = new()
        {
            ReporteId = reporte.Id,
            Confirmado = resultado.Confirmado,
            FocosDetectados = resultado.FocosDetectados,
            DistanciaMasCercanaKm = resultado.DistanciaMasCercanaKm,
            Detalle = resultado.Detalle
        };

        try
        {
            context.VerificacionesSatelitales.Add(verificacion);
            await context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex)
        {
            // Un error transitorio de base de datos no puede tumbar la pantalla de seguimiento
            // (CONTRATO-API.md, regla 3): se devuelve el resultado sin persistir y la próxima
            // consulta del reporte lo reintentará.
            logger.LogWarning(ex, "No se pudo persistir la verificación satelital del reporte {ReporteId}; se devuelve sin guardar", reporte.Id);
            context.VerificacionesSatelitales.Remove(verificacion);
        }

        return verificacion;
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
