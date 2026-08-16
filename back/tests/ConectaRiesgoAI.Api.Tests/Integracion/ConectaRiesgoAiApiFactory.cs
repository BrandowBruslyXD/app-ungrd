using ConectaRiesgoAI.Api.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace ConectaRiesgoAI.Api.Tests.Integracion;

/// <summary>Host de prueba con base en memoria (entorno <c>Testing</c>) y claves mínimas.</summary>
public sealed class ConectaRiesgoAiApiFactory : WebApplicationFactory<Program>
{
    public const string ApiKeyIngesta = "clave-prueba-ingesta-bot";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("Jwt:Secret", "secreto-de-prueba-con-al-menos-32-caracteres");
        builder.UseSetting("Jwt:Issuer", "ConectaRiesgoAI");
        builder.UseSetting("Jwt:Audience", "ConectaRiesgoAI");
        builder.UseSetting("IngestaBot:ApiKey", ApiKeyIngesta);
        builder.UseSetting("Secop:AppToken", "token-prueba");
        builder.UseSetting("ConnectionStrings:AzureStorage", "UseDevelopmentStorage=true");
    }
}
