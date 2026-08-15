using System.Reflection;

namespace ConectaRiesgoAI.Api.Common.Endpoints;

public static class EndpointExtensions
{
    /// <summary>
    /// Busca en el ensamblado todo lo que implemente <see cref="IEndpoint"/> y lo mapea.
    /// Agregar un endpoint nuevo es crear la clase en su slice; no hay lista que mantener.
    /// </summary>
    public static IEndpointRouteBuilder MapEndpointsDeSlices(this IEndpointRouteBuilder app)
    {
        var tipos = Assembly.GetExecutingAssembly()
            .GetTypes()
            .Where(t => typeof(IEndpoint).IsAssignableFrom(t)
                        && t is { IsInterface: false, IsAbstract: false });

        foreach (var tipo in tipos)
        {
            if (Activator.CreateInstance(tipo) is IEndpoint endpoint)
            {
                endpoint.Map(app);
            }
        }

        return app;
    }
}
