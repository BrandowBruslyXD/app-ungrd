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

    /// <summary>Identidad del usuario en WhatsApp. Único; nulo si nunca escribió por ese canal.</summary>
    public string? Telefono { get; set; }

    /// <summary>
    /// Si puede registrar damnificados en el censo. No se pregunta: se acredita explícitamente
    /// (art. 7, Res. 1110 de 2022) — nunca a partir de lo que la persona diga por chat.
    /// </summary>
    public bool EsAcreditadoCenso { get; set; }

    public CanalOrigen OrigenRegistro { get; set; } = CanalOrigen.Web;

    public ICollection<Reporte> Reportes { get; set; } = new List<Reporte>();
}
