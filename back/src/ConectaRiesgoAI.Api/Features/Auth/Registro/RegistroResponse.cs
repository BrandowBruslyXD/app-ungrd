namespace ConectaRiesgoAI.Api.Features.Auth.Registro;

/// <summary>Respuesta `201` de <c>POST /api/auth/registro</c> (ver CONTRATO-API.md).</summary>
public record RegistroResponse(string Token, UsuarioDto Usuario);
