using ConectaRiesgoAI.Api.Domain.Enums;

namespace ConectaRiesgoAI.Api.Domain.Entities;

public class Usuario
{
    public int Id { get; set; }
    public string Nombre { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string PasswordHash { get; set; } = null!;
    public Rol Rol { get; set; } = Rol.Ciudadano;
    public string Municipio { get; set; } = null!;
    public DateTime CreadoEn { get; set; } = DateTime.UtcNow;

    public ICollection<Reporte> Reportes { get; set; } = new List<Reporte>();
}
