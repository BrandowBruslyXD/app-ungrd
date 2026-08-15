using RespondeYA.Integraciones.Modelos;

namespace RespondeYA.Integraciones.Social;

/// <summary>
/// Una fuente de señales sociales.
///
/// Existe esta interfaz por una razón concreta: la API de X cambió sus
/// condiciones y buscar publicaciones dejó de ser gratis. Con esta abstracción,
/// cambiar de red social es cambiar una línea de configuración, no reescribir
/// el sistema. Si consigues acceso de pago a X, se activa; si no, Bluesky
/// hace el mismo trabajo sin costo.
/// </summary>
public interface IFuenteSocial
{
    /// <summary>Nombre legible de la fuente, para mostrar en el panel de administración.</summary>
    string Nombre { get; }

    /// <summary>Si está configurada y lista para usarse.</summary>
    bool Disponible { get; }

    /// <summary>Busca señales de emergencia recientes.</summary>
    Task<IReadOnlyList<SenalSocial>> BuscarAsync(
        IReadOnlyList<string> terminos, CancellationToken ct = default);
}

/// <summary>
/// Fuente vacía para cuando no hay ninguna red social configurada.
/// Evita tener que preguntar por null en cada llamada.
/// </summary>
public class FuenteSocialNula : IFuenteSocial
{
    public string Nombre => "Ninguna";
    public bool Disponible => false;

    public Task<IReadOnlyList<SenalSocial>> BuscarAsync(
        IReadOnlyList<string> terminos, CancellationToken ct = default) =>
        Task.FromResult<IReadOnlyList<SenalSocial>>([]);
}
