namespace ConectaRiesgoAI.Api.Common.Geo;

/// <summary>
/// Cálculos geográficos compartidos. Haversine se calcula en memoria en todas las rebanadas
/// porque no se traduce a SQL sin PostGIS (decisión D7 de CONTROL.md); antes vivía copiado
/// en ListarReportesHandler, ResumenEstadisticasHandler y NasaFirmsClient.
/// </summary>
public static class GeoCalculos
{
    private const double RadioTierraKm = 6371;

    /// <summary>Distancia en km entre dos puntos GPS (fórmula de Haversine).</summary>
    public static double DistanciaKm(double lat1, double lng1, double lat2, double lng2)
    {
        double dLat = GradosARadianes(lat2 - lat1);
        double dLng = GradosARadianes(lng2 - lng1);
        double a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
                + Math.Cos(GradosARadianes(lat1)) * Math.Cos(GradosARadianes(lat2))
                * Math.Sin(dLng / 2) * Math.Sin(dLng / 2);
        double c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return RadioTierraKm * c;
    }

    /// <summary>
    /// Distancia en km al punto del reporte, o <c>null</c> cuando el reporte no tiene
    /// coordenadas (entró por WhatsApp/teléfono sin GPS): no se puede calcular distancia y ese
    /// reporte queda fuera de cualquier filtro por radio.
    /// </summary>
    public static double? DistanciaKm(double lat1, double lng1, double? lat2, double? lng2) =>
        lat2 is null || lng2 is null ? null : DistanciaKm(lat1, lng1, lat2.Value, lng2.Value);

    private static double GradosARadianes(double grados) => grados * Math.PI / 180;
}
