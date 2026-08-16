namespace ConectaRiesgoAI.Api.Common.Reportes;

/// <summary>
/// Formatea el identificador de canal según el origen del reporte.
/// Centraliza el contrato del issue #55 para que web, ingesta y tests usen la misma forma.
/// </summary>
public static class IdentificadorCanalReporte
{
    /// <summary>Identificador para reportes creados desde la app web autenticada.</summary>
    public static string ParaWeb(int usuarioId) => $"usuario:{usuarioId}";

    /// <summary>Identificador para reportes que entran por WhatsApp o llamada telefónica.</summary>
    public static string ParaTelefono(string telefono) => telefono.Trim();
}
