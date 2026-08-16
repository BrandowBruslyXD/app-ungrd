using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Sas;
using Microsoft.Extensions.Options;

namespace ConectaRiesgoAI.Api.Integrations.Storage;

/// <inheritdoc />
public class AlmacenamientoDeArchivosAzure : IAlmacenamientoDeArchivos
{
    private static readonly TimeSpan Timeout = TimeSpan.FromSeconds(5);

    private readonly BlobServiceClient _cliente;
    private readonly OpcionesAlmacenamiento _opciones;
    private readonly ILogger<AlmacenamientoDeArchivosAzure> _logger;

    public AlmacenamientoDeArchivosAzure(
        IConfiguration configuration,
        IOptions<OpcionesAlmacenamiento> opciones,
        ILogger<AlmacenamientoDeArchivosAzure> logger)
    {
        var cadenaConexion = configuration.GetConnectionString("AzureStorage");
        if (string.IsNullOrWhiteSpace(cadenaConexion))
        {
            throw new InvalidOperationException(
                "Falta la sección 'ConnectionStrings:AzureStorage' en la configuración.");
        }

        _cliente = new BlobServiceClient(cadenaConexion);
        _opciones = opciones.Value;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<ResultadoSubida> SubirAsync(
        Contenedor contenedor,
        Stream contenido,
        string tipoContenido,
        CancellationToken cancellationToken)
    {
        using var conTimeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        conTimeout.CancelAfter(Timeout);

        try
        {
            var contenedorCliente = _cliente.GetBlobContainerClient(contenedor.ANombre());
            await contenedorCliente.CreateIfNotExistsAsync(
                PublicAccessType.None, cancellationToken: conTimeout.Token);

            var nombreBlob = $"{Guid.NewGuid():N}{ExtensionPara(tipoContenido)}";
            var blobCliente = contenedorCliente.GetBlobClient(nombreBlob);

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
            _logger.LogWarning(ex, "No se pudo subir el archivo al contenedor {Contenedor}", contenedor);
            return new ResultadoSubida(false, null, ex.Message);
        }
    }

    private string? GenerarUrlFirmada(BlobClient blobCliente)
    {
        if (!blobCliente.CanGenerateSasUri)
        {
            _logger.LogWarning(
                "El cliente de blob no puede firmar URLs (¿credencial sin acceso a la cuenta?)");
            return null;
        }

        var constructorSas = new BlobSasBuilder
        {
            BlobContainerName = blobCliente.BlobContainerName,
            BlobName = blobCliente.Name,
            Resource = "b",
            ExpiresOn = DateTimeOffset.UtcNow.AddMinutes(_opciones.SasExpiracionMinutos)
        };
        constructorSas.SetPermissions(BlobSasPermissions.Read);

        return blobCliente.GenerateSasUri(constructorSas).ToString();
    }

    private static string ExtensionPara(string tipoContenido) => tipoContenido switch
    {
        "image/jpeg" => ".jpg",
        "image/png" => ".png",
        "image/webp" => ".webp",
        _ => string.Empty
    };
}
