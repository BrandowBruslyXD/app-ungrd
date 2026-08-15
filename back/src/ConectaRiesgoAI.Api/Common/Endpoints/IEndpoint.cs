namespace ConectaRiesgoAI.Api.Common.Endpoints;

/// <summary>
/// Cada slice implementa esto en su carpeta y queda registrado solo.
/// Nadie tiene que tocar Program.cs para agregar un endpoint.
/// </summary>
public interface IEndpoint
{
    void Map(IEndpointRouteBuilder app);
}
