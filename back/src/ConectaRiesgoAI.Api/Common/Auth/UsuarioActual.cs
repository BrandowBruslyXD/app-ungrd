using System.Security.Claims;
using ConectaRiesgoAI.Api.Domain.Enums;

namespace ConectaRiesgoAI.Api.Common.Auth;

/// <summary>Quién está haciendo la petición. Los slices lo inyectan en vez de hurgar en HttpContext.</summary>
public interface IUsuarioActual
{
    int? Id { get; }
    string? Nombre { get; }
    Rol? Rol { get; }
    bool EstaAutenticado { get; }
}

public class UsuarioActual(IHttpContextAccessor accessor) : IUsuarioActual
{
    private ClaimsPrincipal? Principal => accessor.HttpContext?.User;

    public int? Id =>
        int.TryParse(Principal?.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    public string? Nombre => Principal?.FindFirstValue(ClaimTypes.Name);

    public Rol? Rol =>
        Enum.TryParse<Rol>(Principal?.FindFirstValue(ClaimTypes.Role), out var rol) ? rol : null;

    public bool EstaAutenticado => Principal?.Identity?.IsAuthenticated ?? false;
}
