using System.Globalization;
using System.Net.Http.Json;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace ConectaRiesgoAI.Api.Integrations.Secop;

/// <summary>
/// Cliente HTTP contra el dataset de contratos de SECOP en Datos Abiertos de Colombia (Socrata).
/// Filtra por municipio (columna <c>ciudad</c> del dataset) y por palabras clave de prevención de
/// riesgo en el objeto del contrato. Se cachea por municipio para no repetir la consulta en cada
/// carga de pantalla, y ante cualquier falla responde lista vacía o datos de respaldo — nunca
/// propaga la excepción, porque un SECOP caído no puede tumbar la pantalla de detalle.
/// </summary>
public class SecopClient(HttpClient httpClient, IMemoryCache cache, IOptions<SecopOptions> opciones, ILogger<SecopClient> logger)
    : ISecopClient
{
    /// <summary>Recurso del dataset. Palabras clave del issue CR-23 para acotar a obras de prevención del riesgo.</summary>
    private const string RecursoDataset = "resource/jbjy-vk9h.json";

    private static readonly string[] PalabrasClave =
    [
        "alcantarillado", "canalizacion", "gestion del riesgo", "prevencion", "mitigacion", "obras de contencion"
    ];

    private static readonly TimeSpan DuracionCache = TimeSpan.FromMinutes(30);

    private readonly SecopOptions _opciones = opciones.Value;

    /// <inheritdoc />
    public async Task<IReadOnlyList<ContratoSecop>> ConsultarPorMunicipioAsync(string municipio, CancellationToken cancellationToken)
    {
        string clave = $"secop:{NormalizadorMunicipio.Normalizar(municipio)}";
        if (cache.TryGetValue(clave, out IReadOnlyList<ContratoSecop>? enCache))
        {
            return enCache!;
        }

        IReadOnlyList<ContratoSecop> resultado = await ConsultarSinCacheAsync(municipio, cancellationToken);
        // Size explícito: sin él, SecopOptions.SizeLimit (configurado en Program.cs) no aplica y
        // el caché crecería sin tope con cada municipio distinto que llegue por el endpoint público.
        cache.Set(clave, resultado, new MemoryCacheEntryOptions { AbsoluteExpirationRelativeToNow = DuracionCache, Size = 1 });
        return resultado;
    }

    private async Task<IReadOnlyList<ContratoSecop>> ConsultarSinCacheAsync(string municipio, CancellationToken cancellationToken)
    {
        try
        {
            string url = ConstruirUrl(municipio);
            using HttpRequestMessage peticion = new(HttpMethod.Get, url);
            if (!string.IsNullOrWhiteSpace(_opciones.AppToken))
            {
                peticion.Headers.Add("X-App-Token", _opciones.AppToken);
            }

            HttpResponseMessage respuesta = await httpClient.SendAsync(peticion, cancellationToken);
            if (!respuesta.IsSuccessStatusCode)
            {
                logger.LogWarning(
                    "SECOP respondió {StatusCode} al consultar el municipio {Municipio}",
                    (int)respuesta.StatusCode, municipio);
                return Respaldo(municipio);
            }

            List<SecopContratoDto>? crudos = await respuesta.Content.ReadFromJsonAsync<List<SecopContratoDto>>(cancellationToken);
            List<ContratoSecop> contratos = (crudos ?? [])
                .Select(MapearOMostrarNulo)
                .Where(c => c is not null)
                .Select(c => c!)
                .ToList();

            return contratos.Count > 0 ? contratos : Respaldo(municipio);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // El propio caller canceló (el ciudadano cerró la pestaña, el gateway cortó la
            // petición): no es una falla de SECOP, no hay nadie esperando el respaldo. Se deja
            // propagar en vez de aparentar éxito con datos que nadie va a leer.
            throw;
        }
        catch (Exception ex)
        {
            // Deliberadamente amplio: esta es la frontera con un servicio externo y su contrato
            // (ver ISecopClient) es no lanzar nunca ante una falla de la integración (timeout de
            // SECOP, red, JSON malformado). Nunca se registra el cuerpo de la respuesta ni datos
            // de contratos: solo el municipio, que no es un dato personal (ver CLAUDE.md, "los
            // logs llevan identificadores, no contenido").
            logger.LogWarning(ex, "Falló la consulta a SECOP para el municipio {Municipio}", municipio);
            return Respaldo(municipio);
        }
    }

    private IReadOnlyList<ContratoSecop> Respaldo(string municipio) =>
        _opciones.UsarRespaldoSiFalla ? SecopContratosRespaldo.Para(municipio) : [];

    private string ConstruirUrl(string municipio)
    {
        string filtroObjeto = string.Join(" OR ", PalabrasClave.Select(p => $"upper(objeto_del_contrato) like '%{p.ToUpperInvariant()}%'"));
        string where = $"upper(ciudad)='{EscaparParaSoql(municipio.Trim().ToUpperInvariant())}' AND ({filtroObjeto})";

        var parametros = new List<string>
        {
            $"$where={Uri.EscapeDataString(where)}",
            $"$order={Uri.EscapeDataString("valor_del_contrato DESC")}",
            $"$limit={_opciones.MaximoContratos}",
            $"$select={Uri.EscapeDataString("objeto_del_contrato,valor_del_contrato,fecha_de_firma,nombre_entidad")}"
        };

        return $"{RecursoDataset}?{string.Join("&", parametros)}";
    }

    /// <summary>Las comillas simples son el único caracter que rompe una cadena literal SoQL; se escapan duplicándolas.</summary>
    private static string EscaparParaSoql(string valor) => valor.Replace("'", "''");

    private static ContratoSecop? MapearOMostrarNulo(SecopContratoDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.ObjetoDelContrato) || string.IsNullOrWhiteSpace(dto.NombreEntidad))
        {
            return null;
        }

        if (!decimal.TryParse(dto.ValorDelContrato, NumberStyles.Number, CultureInfo.InvariantCulture, out decimal valor))
        {
            return null;
        }

        int anio = DateTime.TryParse(dto.FechaDeFirma, CultureInfo.InvariantCulture, DateTimeStyles.None, out DateTime fecha)
            ? fecha.Year
            : DateTime.UtcNow.Year;

        return new ContratoSecop(dto.ObjetoDelContrato, valor, anio, dto.NombreEntidad);
    }
}
