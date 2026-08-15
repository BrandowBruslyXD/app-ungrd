using FluentValidation;
using MediatR;

namespace ConectaRiesgoAI.Api.Common.Behaviors;

/// <summary>
/// Corre los validadores del request antes de llegar al handler.
/// Por eso un slice puede escribir su validador y no llamarlo desde ningún lado.
/// </summary>
public class ValidationBehavior<TRequest, TResponse>(IEnumerable<IValidator<TRequest>> validadores)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        if (!validadores.Any())
        {
            return await next(cancellationToken);
        }

        var contexto = new ValidationContext<TRequest>(request);
        var resultados = await Task.WhenAll(
            validadores.Select(v => v.ValidateAsync(contexto, cancellationToken)));

        var fallas = resultados.SelectMany(r => r.Errors).Where(f => f is not null).ToList();
        if (fallas.Count > 0)
        {
            throw new ValidationException(fallas);
        }

        return await next(cancellationToken);
    }
}
