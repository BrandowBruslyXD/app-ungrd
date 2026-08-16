namespace ConectaRiesgoAI.Api.Persistence;

/// <summary>
/// Nombres de índices únicos en Postgres. Deben coincidir con
/// <see cref="Configurations.ReporteConfiguration"/> y
/// <see cref="Configurations.UsuarioConfiguration"/>; los servicios los usan para distinguir
/// colisiones esperadas de otros errores de guardado.
/// </summary>
public static class IndicesPostgres
{
    /// <summary>Idempotencia de webhooks por canal + referencia externa.</summary>
    public const string ReportesCanalReferenciaExterna = "IX_reportes_Canal_ReferenciaExterna";

    /// <summary>Un teléfono, un usuario: unifica WhatsApp y llamada.</summary>
    public const string UsuariosTelefono = "IX_usuarios_Telefono";

    /// <summary>
    /// Cédula no repetida dentro de la misma <see cref="Persistence.Configurations.OperacionCensoConfiguration"/>
    /// (regla del RUD del issue #48). Solo aplica cuando hay número de documento: <c>SinDocumento</c> queda fuera.
    /// </summary>
    public const string PersonasAfectadasOperacionCensoNumeroDocumento =
        "IX_personas_afectadas_OperacionCensoId_NumeroDocumento";

    /// <summary>
    /// Una jornada abierta por brigadista y municipio a la vez. Evita que dos peticiones
    /// concurrentes del mismo brigadista abran dos <see cref="Entities.OperacionCenso"/> distintas
    /// para el mismo municipio (ver issue #48, revisión del PR #66).
    /// </summary>
    public const string OperacionesCensoBrigadistaMunicipioAbierta =
        "IX_operaciones_censo_BrigadistaId_Municipio_Abierta";
}
