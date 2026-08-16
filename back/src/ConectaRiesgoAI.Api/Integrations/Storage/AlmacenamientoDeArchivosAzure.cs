using System.Collections.Concurrent;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Sas;
using Microsoft.Extensions.Options;

namespace ConectaRiesgoAI.Api.Integrations.Storage;

/// <inheritdoc />
public class AlmacenamientoDeArchivosAzure : IAlmacenamientoDeArchivos
{
    private static readonly TimeSpan Timeout = TimeSpan.FromSeconds(5);

    private readonly BlobServiceClient? _cliente;
    private readonly OpcionesAlmacenamiento _opciones;
    private readonly ILogger<AlmacenamientoDeArchivosAzure> _logger;

    /// <summary>Contenedores para los que ya se confirmó que existen, para no repetir la llamada en cada subida.</summary>
    private readonly ConcurrentDictionary<Contenedor, bool> _contenedoresVerificados = new();

    public AlmacenamientoDeArchivosAzure(
        IConfiguration configuration,
        IOptions<OpcionesAlmacenamiento> opciones,
        ILogger<AlmacenamientoDeArchivosAzure> logger)
    {
        _opciones = opciones.Value;
        _logger = logger;

        // Nunca lanza: si falta la configuración o es inválida, SubirAsync lo trata como
        // cualquier otro fallo de Azure y responde Exitoso = false, sin tumbar al llamador
        // (ver issue #47, escenario "el blob no está disponible").
        string? cadenaConexion = configuration.GetConnectionString("AzureStorage");
        if (string.IsNullOrWhiteSpace(cadenaConexion))
        {
            _logger.LogWarning(
                "Falta 'ConnectionStrings:AzureStorage' en la configuración; las subidas de evidencias fallarán de forma controlada hasta que se aprovisione.");
            return;
        }

        try
        {
            _cliente = new BlobServiceClient(cadenaConexion);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "No se pudo crear el cliente de Azure Blob Storage con la cadena de conexión configurada.");
        }
    }

    /// <inheritdoc />
    public async Task<ResultadoSubida> SubirAsync(
        Contenedor contenedor,
        Stream contenido,
        string tipoContenido,
        CancellationToken cancellationToken)
    {
        if (_cliente is null)
        {
            return new ResultadoSubida(false, null, "El cliente de Azure Blob Storage no está configurado.");
        }

        using CancellationTokenSource conTimeout =
            CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        conTimeout.CancelAfter(Timeout);

        try
        {
            BlobContainerClient contenedorCliente = _cliente.GetBlobContainerClient(contenedor.ANombre());
            if (!_contenedoresVerificados.ContainsKey(contenedor))
            {
                await contenedorCliente.CreateIfNotExistsAsync(
                    PublicAccessType.None, cancellationToken: conTimeout.Token);
                _contenedoresVerificados[contenedor] = true;
            }

            string nombreBlob = $"{Guid.NewGuid():N}{ExtensionPara(tipoContenido)}";
            BlobClient blobCliente = contenedorCliente.GetBlobClient(nombreBlob);

            await blobCliente.UploadAsync(
                contenido,
                new BlobHttpHeaders { ContentType = tipoContenido },
                cancellationToken: conTimeout.Token);

            return new ResultadoSubida(true, GenerarUrlFirmada(blobCliente), null);
        }
        catch (Exception ex)
        {
            // Nunca propaga: un blob caído no puede tumbar al llamador (ver CLAUDE.md,
            // mismo trato que Integrations/Nasa e Integrations/Secop).
            if (cancellationToken.IsCancellationRequested)
            {
                // Quien llamaba canceló la operación: no es un fallo nuestro que investigar.
                _logger.LogInformation("La subida al contenedor {Contenedor} se canceló por quien llamaba.", contenedor);
            }
            else
            {
                _logger.LogWarning(ex, "No se pudo subir el archivo al contenedor {Contenedor}", contenedor);
            }

            return new ResultadoSubida(false, null, ex.Message);
        }
    }

    /// <summary>Arma la URL firmada (SAS) de solo lectura, con la expiración configurada.</summary>
    private string? GenerarUrlFirmada(BlobClient blobCliente)
    {
        if (!blobCliente.CanGenerateSasUri)
        {
            _logger.LogWarning(
                "El cliente de blob no puede firmar URLs (¿credencial sin acceso a la cuenta?)");
            return null;
        }

        BlobSasBuilder constructorSas = new()
        {
            BlobContainerName = blobCliente.BlobContainerName,
            BlobName = blobCliente.Name,
            Resource = "b",
            ExpiresOn = DateTimeOffset.UtcNow.AddMinutes(_opciones.SasExpiracionMinutos)
        };
        constructorSas.SetPermissions(BlobSasPermissions.Read);

        return blobCliente.GenerateSasUri(constructorSas).ToString();
    }

    /// <summary>Extensión del blob según el tipo MIME ya validado por el llamador.</summary>
    private static string ExtensionPara(string tipoContenido) => tipoContenido switch
    {
        "image/jpeg" => ".jpg",
        "image/png" => ".png",
        "image/webp" => ".webp",
        _ => string.Empty
    };
}
