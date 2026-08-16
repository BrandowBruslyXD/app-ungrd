using FluentValidation;

namespace ConectaRiesgoAI.Api.Features.Evidencias.SubirEvidencia;

/// <summary>Los límites del issue #47: 5 MB, solo imágenes — verificadas por firma de bytes, no solo por el header.</summary>
public class SubirEvidenciaValidator : AbstractValidator<SubirEvidenciaCommand>
{
    private const long TamanoMaximoBytes = 5 * 1024 * 1024;
    private static readonly string[] TiposPermitidos = ["image/jpeg", "image/png", "image/webp"];

    public SubirEvidenciaValidator()
    {
        RuleFor(c => c.TamanoBytes)
            .LessThanOrEqualTo(TamanoMaximoBytes)
            .WithMessage("El archivo no puede pesar más de 5 MB.");

        RuleFor(c => c.TipoContenido)
            .Must(tipo => TiposPermitidos.Contains(tipo))
            .WithMessage("Solo se aceptan imágenes JPEG, PNG o WEBP.");

        RuleFor(c => c.Contenido)
            .MustAsync((comando, contenido, ct) => EsImagenValidaAsync(contenido, comando.TipoContenido, ct))
            .WithMessage("El archivo no coincide con una imagen JPEG, PNG o WEBP válida.");
    }

    /// <summary>
    /// El `Content-Type` lo elige quien llama y no prueba nada por sí solo; esto confirma la
    /// firma real de los primeros bytes del archivo antes de aceptarlo.
    /// </summary>
    private static async Task<bool> EsImagenValidaAsync(Stream contenido, string tipoContenido, CancellationToken ct)
    {
        if (!contenido.CanSeek)
        {
            // Sin poder rebobinar no se puede verificar sin perder el archivo: se rechaza.
            return false;
        }

        long posicionOriginal = contenido.Position;
        byte[] cabecera = new byte[12];
        contenido.Position = 0;
        int leidos = await contenido.ReadAsync(cabecera.AsMemory(0, cabecera.Length), ct);
        contenido.Position = posicionOriginal;

        return tipoContenido switch
        {
            "image/jpeg" => leidos >= 3
                && cabecera[0] == 0xFF && cabecera[1] == 0xD8 && cabecera[2] == 0xFF,

            "image/png" => leidos >= 8
                && cabecera[0] == 0x89 && cabecera[1] == 0x50 && cabecera[2] == 0x4E && cabecera[3] == 0x47
                && cabecera[4] == 0x0D && cabecera[5] == 0x0A && cabecera[6] == 0x1A && cabecera[7] == 0x0A,

            "image/webp" => leidos >= 12
                && cabecera[0] == 'R' && cabecera[1] == 'I' && cabecera[2] == 'F' && cabecera[3] == 'F'
                && cabecera[8] == 'W' && cabecera[9] == 'E' && cabecera[10] == 'B' && cabecera[11] == 'P',

            _ => false
        };
    }
}
