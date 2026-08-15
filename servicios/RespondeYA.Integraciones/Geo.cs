namespace RespondeYA.Integraciones;

/// <summary>
/// Cálculos geográficos sin depender de PostGIS.
/// Para las distancias de esta aplicación, Haversine sobra.
/// </summary>
public static class Geo
{
    private const double RadioTierraKm = 6371.0;

    /// <summary>Distancia en kilómetros entre dos puntos.</summary>
    public static double DistanciaKm(double lat1, double lon1, double lat2, double lon2)
    {
        var dLat = Radianes(lat2 - lat1);
        var dLon = Radianes(lon2 - lon1);

        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(Radianes(lat1)) * Math.Cos(Radianes(lat2)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);

        return RadioTierraKm * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    }

    /// <summary>
    /// Caja rectangular alrededor de un punto, en el formato que pide NASA FIRMS:
    /// oeste,sur,este,norte
    /// </summary>
    public static string CajaDelimitadora(double lat, double lon, double radioKm)
    {
        // Un grado de latitud son ~111 km en cualquier parte del planeta.
        var deltaLat = radioKm / 111.0;

        // Un grado de longitud se encoge al acercarse a los polos.
        var deltaLon = radioKm / (111.0 * Math.Cos(Radianes(lat)));

        var oeste = lon - deltaLon;
        var sur = lat - deltaLat;
        var este = lon + deltaLon;
        var norte = lat + deltaLat;

        return string.Create(System.Globalization.CultureInfo.InvariantCulture,
            $"{oeste:F4},{sur:F4},{este:F4},{norte:F4}");
    }

    private static double Radianes(double grados) => grados * Math.PI / 180.0;
}
