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
