using ConectaRiesgoAI.Api.Domain.Entities;
using ConectaRiesgoAI.Api.Domain.Enums;

namespace ConectaRiesgoAI.Api.Common.Reportes;

/// <summary>
/// Resuelve o crea el <see cref="Usuario"/> a partir del teléfono del ciudadano.
/// Unifica identidad entre WhatsApp y llamada telefónica.
/// </summary>
public interface IResolutorUsuarioPorTelefono
{
    /// <summary>
    /// Devuelve el usuario existente con ese teléfono, o crea uno nuevo de rol Ciudadano.
    /// </summary>
    Task<Usuario> ResolverOCrearAsync(
        string telefono,
        CanalOrigen canalOrigen,
        string nombreContacto,
        string municipio,
        CancellationToken cancellationToken);
}
