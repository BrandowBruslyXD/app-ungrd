using System.Text.Json.Serialization;

namespace ConectaRiesgoAI.Api.Integrations.Secop;

/// <summary>
/// Forma cruda de un registro del dataset de SECOP en Datos Abiertos de Colombia
/// (<c>datos.gov.co/resource/jbjy-vk9h.json</c>). Los nombres de propiedad respetan los del
/// dataset (snake_case) porque así los serializa Socrata; no se expone fuera de
/// <c>Integrations/Secop</c>, cada rebanada que lo consume arma su propio DTO de salida.
/// </summary>
public class SecopContratoDto
{
    [JsonPropertyName("objeto_del_contrato")]
    public string? ObjetoDelContrato { get; set; }

    [JsonPropertyName("valor_del_contrato")]
    public string? ValorDelContrato { get; set; }

    [JsonPropertyName("fecha_de_firma")]
    public string? FechaDeFirma { get; set; }

    [JsonPropertyName("nombre_entidad")]
    public string? NombreEntidad { get; set; }
}
