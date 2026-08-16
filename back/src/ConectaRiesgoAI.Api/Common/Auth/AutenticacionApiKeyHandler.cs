using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using ConectaRiesgoAI.Api.Common.Errors;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;

namespace ConectaRiesgoAI.Api.Common.Auth;

/// <summary>
/// Autentica al bot de WhatsApp con la cabecera <c>X-Api-Key</c>, no con JWT: el bot no es una
/// persona con sesión, es un servicio que escribe reportes a nombre de muchas (ver
/// docs/INTEGRACION-BOT-BACKEND.md, sección 2).
/// </summary>
public class AutenticacionApiKeyHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    IOptions<OpcionesApiKeyIngesta> opcionesApiKey)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string Esquema = "ApiKey";
    private const string Cabecera = "X-Api-Key";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue(Cabecera, out StringValues valores))
        {
            // Sin el body: los logs llevan identificadores, no contenido (CLAUDE.md).
            Logger.LogWarning("Ingesta sin cabecera {Cabecera} desde {Ip}", Cabecera, IpDelCliente());
            return Task.FromResult(AuthenticateResult.Fail($"Falta la cabecera {Cabecera}"));
        }

        if (!TryExtraerClaveRecibida(valores, out string? claveRecibida, out string? errorExtraccion))
        {
            Logger.LogWarning(
                "Ingesta con cabecera {Cabecera} malformada ({Motivo}) desde {Ip}",
                Cabecera, errorExtraccion, IpDelCliente());
            return Task.FromResult(AuthenticateResult.Fail(errorExtraccion!));
        }

        if (!EsClaveValida(claveRecibida, opcionesApiKey.Value.ApiKey))
        {
            Logger.LogWarning("Ingesta con clave de servicio inválida desde {Ip}", IpDelCliente());
            return Task.FromResult(AuthenticateResult.Fail("Clave de servicio inválida"));
        }

        ClaimsIdentity identidad = new([new Claim(ClaimTypes.NameIdentifier, "bot-whatsapp")], Esquema);
        AuthenticationTicket ticket = new(new ClaimsPrincipal(identidad), Esquema);
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }

    protected override Task HandleChallengeAsync(AuthenticationProperties properties)
    {
        Response.StatusCode = StatusCodes.Status401Unauthorized;
        return Response.WriteAsJsonAsync(new RespuestaError("Falta la clave de servicio o no es válida"));
    }

    private string? IpDelCliente() => Context.Connection.RemoteIpAddress?.ToString();

    /// <summary>
    /// Extrae la clave de una única cabecera. Rechaza múltiples valores: <see cref="StringValues.ToString"/>
    /// los concatena con coma y abriría bypass si la clave configurada contiene coma.
    /// </summary>
    public static bool TryExtraerClaveRecibida(StringValues valores, out string? clave, out string? error)
    {
        clave = null;
        error = null;

        if (valores.Count == 0)
        {
            error = "Clave de servicio vacía o malformada";
            return false;
        }

        if (valores.Count > 1)
        {
            error = "Cabecera malformada";
            return false;
        }

        clave = valores[0];
        if (string.IsNullOrEmpty(clave))
        {
            error = "Clave de servicio vacía o malformada";
            return false;
        }

        return true;
    }

    /// <summary>Comparación en tiempo constante: una clave de servicio no se compara con <c>==</c>.</summary>
    public static bool EsClaveValida(string? recibida, string? configurada) =>
        !string.IsNullOrEmpty(configurada)
        && !string.IsNullOrEmpty(recibida)
        && CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(recibida), Encoding.UTF8.GetBytes(configurada));
}
