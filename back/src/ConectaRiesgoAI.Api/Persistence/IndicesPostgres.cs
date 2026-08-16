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
}
