namespace ConectaRiesgoAI.Api.Common.Auth;

public class OpcionesJwt
{
    public const string Seccion = "Jwt";

    public string Secret { get; set; } = null!;
    public string Issuer { get; set; } = "ConectaRiesgoAI";
    public string Audience { get; set; } = "ConectaRiesgoAI";
    public int HorasDeVigencia { get; set; } = 12;
}
