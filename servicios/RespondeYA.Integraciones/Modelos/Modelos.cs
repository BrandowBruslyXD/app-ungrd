namespace RespondeYA.Integraciones.Modelos;

/// <summary>
/// Resultado de consultar un satélite para confirmar un reporte.
/// Corresponde al bloque "verificacionSatelital" del contrato de API.
/// </summary>
public record VerificacionSatelital(
    string Fuente,
    bool Confirmado,
    string Detalle,
    DateTime ConsultadoEn,
    int FocosDetectados,
    double? DistanciaMasCercanaKm);

/// <summary>
/// Un contrato público de SECOP relacionado con prevención del riesgo.
/// Corresponde a un elemento del bloque "transparencia" del contrato de API.
/// </summary>
public record ContratoPublico(
    string Objeto,
    decimal Valor,
    int Anio,
    string Entidad);

/// <summary>De dónde salieron los contratos que se están mostrando.</summary>
public enum OrigenDatos
{
    /// <summary>Consultados en vivo a SECOP. Son datos reales y verificables.</summary>
    ApiEnVivo,

    /// <summary>
    /// Datos de respaldo, usados porque SECOP no respondió.
    /// NO son datos reales: existen para que la demo no se caiga.
    /// La interfaz DEBE advertirlo y en el pitch hay que decirlo.
    /// </summary>
    Respaldo
}

/// <summary>
/// Resultado de consultar contratos, junto con la procedencia de los datos.
///
/// El origen viaja explícito por una razón de honestidad: si SECOP se cae
/// durante la demo y mostramos datos de respaldo como si fueran reales,
/// estaríamos engañando al jurado. Que el dato diga de dónde viene permite
/// que la interfaz lo advierta.
/// </summary>
public record ResultadoContratos(
    IReadOnlyList<ContratoPublico> Contratos,
    OrigenDatos Origen);

/// <summary>
/// Una señal de emergencia detectada en una red social o en medios.
/// El sistema la convierte después en un reporte automático.
/// </summary>
public record SenalSocial(
    string Fuente,
    string IdExterno,
    string Texto,
    string? Autor,
    string? Url,
    DateTime PublicadoEn,
    string TipoSugerido,
    string? MunicipioDetectado,
    int Relevancia);

/// <summary>
/// Los tipos de emergencia del contrato de API. Sin tildes ni eñes,
/// para que el valor viaje igual entre C# y JavaScript.
/// </summary>
public static class TiposEmergencia
{
    public const string Incendio = "Incendio";
    public const string Inundacion = "Inundacion";
    public const string Deslizamiento = "Deslizamiento";
    public const string ViaAfectada = "ViaAfectada";
    public const string ColapsoEstructural = "ColapsoEstructural";
    public const string Otro = "Otro";
}
