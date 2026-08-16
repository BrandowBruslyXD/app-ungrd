using ConectaRiesgoAI.Api.Domain.Entities;
using ConectaRiesgoAI.Api.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ConectaRiesgoAI.Api.Features.Ingesta.ObtenerReporte;

/// <summary>
/// Arma la respuesta que el bot interpola en WhatsApp: sin arreglos, todo en texto plano (ver
/// docs/INTEGRACION-BOT-BACKEND.md, sección 3.2). Un código inexistente responde 200, nunca
/// 404: el nodo HTTP de wabots solo detecta fallos de red, así que un 404 saldría por la rama
/// de éxito con los campos vacíos.
/// </summary>
public class ObtenerReporteIngestaHandler(AppDbContext db)
    : IRequestHandler<ObtenerReporteIngestaQuery, ObtenerReporteIngestaResponse>
{
    public async Task<ObtenerReporteIngestaResponse> Handle(
        ObtenerReporteIngestaQuery query, CancellationToken cancellationToken)
    {
        string codigo = query.Codigo.Trim();
        Reporte? reporte = await db.Reportes
            .AsNoTracking()
            .Include(r => r.Cronologia)
            .FirstOrDefaultAsync(r => r.Codigo == codigo, cancellationToken);

        if (reporte is null)
        {
            return new ObtenerReporteIngestaResponse(
                codigo,
                "No encontrado",
                "—",
                "No encontré un reporte con ese código.\n\nRevisa que esté completo.");
        }

        return new ObtenerReporteIngestaResponse(
            reporte.Codigo,
            reporte.Estado.ToString(),
            FormatearFecha(reporte.ActualizadoEn),
            ArmarDetalle(reporte));
    }

    private static string ArmarDetalle(Reporte reporte)
    {
        List<string> lineas = [];
        if (!string.IsNullOrWhiteSpace(reporte.UbicacionTexto))
        {
            lineas.Add($"📍 {reporte.UbicacionTexto}");
        }

        lineas.Add(string.Empty);
        lineas.Add("*Cronología:*");
        lineas.AddRange(reporte.Cronologia
            .OrderBy(e => e.Fecha)
            .Select(e => string.IsNullOrWhiteSpace(e.Nota)
                ? $"• {e.Estado} — {FormatearFecha(e.Fecha)}"
                : $"• {e.Estado} — {FormatearFecha(e.Fecha)}\n  {e.Nota}"));

        return string.Join('\n', lineas);
    }

    /// <summary>"15:30 del 16/8": mismo formato que ya usa servicios/ms-bot-api, sin ceros a la izquierda en día y mes.</summary>
    private static string FormatearFecha(DateTime fecha) => $"{fecha:HH:mm} del {fecha.Day}/{fecha.Month}";
}
