namespace ConectaRiesgoAI.Api.Features.Auth.Login;

/// <summary>Respuesta `200` de <c>POST /api/auth/login</c> — misma forma que la de registro (ver CONTRATO-API.md).</summary>
public record LoginResponse(string Token, UsuarioDto Usuario);
