using ConectaRiesgoAI.Api.Domain.Entities;
using ConectaRiesgoAI.Api.Domain.Enums;
using ConectaRiesgoAI.Api.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace ConectaRiesgoAI.Api.Features.Ingesta.CrearReporte;

/// <summary>
/// Crea un reporte a nombre del teléfono que escribe por WhatsApp: si el teléfono no tiene
/// Usuario, lo crea sin contraseña con Rol Ciudadano; si ya existe, lo reutiliza (ver
/// docs/INTEGRACION-BOT-BACKEND.md, sección 2).
/// </summary>
public class CrearReporteIngestaHandler(AppDbContext db, ILogger<CrearReporteIngestaHandler> logger)
    : IRequestHandler<CrearReporteIngestaCommand, CrearReporteIngestaResponse>
{
    private const int MaximoIntentos = 3;

    public async Task<CrearReporteIngestaResponse> Handle(
        CrearReporteIngestaCommand command, CancellationToken cancellationToken)
    {
        string telefono = command.Telefono.Trim();
        Usuario usuario = await ObtenerOCrearUsuario(telefono, command.NombreContacto, command.UbicacionTexto, cancellationToken);

        if (!MapeoClaseReporte.TryMapear(command.Clase, out ClaseReporte clase))
        {
            // El validador ya lo bloqueó antes de llegar aquí; esto es solo la red de seguridad.
            throw new InvalidOperationException($"Clase de reporte no reconocida: '{command.Clase}'");
        }

        Reporte reporte = null!;
        for (int intento = 1; intento <= MaximoIntentos; intento++)
        {
            DateTime ahora = DateTime.UtcNow;
            string prefijo = $"RPT-{ahora:yyyy-MM-dd}-";
            int consecutivo = await db.Reportes.CountAsync(
                r => r.Codigo.StartsWith(prefijo), cancellationToken) + 1;

            reporte = new Reporte
            {
                Codigo = Reporte.GenerarCodigo(ahora, consecutivo),
                Tipo = command.Tipo,
                Descripcion = ArmarDescripcion(command),
                UbicacionTexto = command.UbicacionTexto?.Trim(),
                Municipio = DerivarMunicipio(command.UbicacionTexto),
                UrlFoto = command.UrlFoto,
                Clase = clase,
                Confianza = ConfianzaReporte.Autorreportado,
                Canal = CanalOrigen.WhatsApp,
                UsuarioId = usuario.Id
            };
            reporte.Cronologia.Add(new EventoCronologia
            {
                Estado = EstadoReporte.Reportado,
                Nota = "Reporte recibido por WhatsApp",
                Responsable = "Sistema"
            });

            db.Reportes.Add(reporte);

            try
            {
                await db.SaveChangesAsync(cancellationToken);
                break;
            }
            catch (DbUpdateException ex) when (ViolaIndiceUnico(ex) && intento < MaximoIntentos)
            {
                // Dos reportes del mismo día llegaron a la vez y calcularon el mismo consecutivo:
                // se descarta el intento y se recalcula. Cualquier otro fallo sigue de largo hasta
                // ManejadorGlobalDeErrores, que lo loguea como el 500 que es.
                db.Reportes.Remove(reporte);
            }
        }

        logger.LogInformation("Reporte creado por WhatsApp: {Codigo}", reporte.Codigo);
        return new CrearReporteIngestaResponse(reporte.Codigo, reporte.Estado);
    }

    private async Task<Usuario> ObtenerOCrearUsuario(
        string telefono, string? nombreContacto, string? ubicacionTexto, CancellationToken cancellationToken)
    {
        Usuario? usuario = await db.Usuarios.SingleOrDefaultAsync(u => u.Telefono == telefono, cancellationToken);
        if (usuario is not null)
        {
            return usuario;
        }

        usuario = new Usuario
        {
            Nombre = string.IsNullOrWhiteSpace(nombreContacto) ? telefono : nombreContacto.Trim(),
            // Email sintético: el índice único de Email exige un valor, y el ciudadano de WhatsApp
            // no tiene correo. Si luego se registra en la web con el mismo teléfono, se vincula ahí.
            Email = $"whatsapp-{telefono}@conectariesgoai.demo",
            // Nadie inicia sesión con esto: hash de un valor aleatorio, no una contraseña real.
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString()),
            Rol = Rol.Ciudadano,
            Municipio = DerivarMunicipio(ubicacionTexto),
            Telefono = telefono,
            OrigenRegistro = CanalOrigen.WhatsApp
        };
        db.Usuarios.Add(usuario);

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (ViolaIndiceUnico(ex))
        {
            // El mismo teléfono escribió dos veces a la vez: el otro request ya lo creó.
            db.Entry(usuario).State = EntityState.Detached;
            usuario = await db.Usuarios.SingleAsync(u => u.Telefono == telefono, cancellationToken);
        }

        return usuario;
    }

    private static string ArmarDescripcion(CrearReporteIngestaCommand command)
    {
        List<string> partes = [command.Descripcion.Trim()];
        if (!string.IsNullOrWhiteSpace(command.NivelDano))
        {
            partes.Add($"Nivel de daño: {command.NivelDano.Trim()}");
        }

        if (!string.IsNullOrWhiteSpace(command.Necesidad))
        {
            partes.Add($"Necesidad: {command.Necesidad.Trim()}");
        }

        return string.Join(" | ", partes);
    }

    /// <summary>
    /// El bot recibe la ubicación como texto libre, no como municipio. Se toma el primer
    /// segmento como aproximación: "Soacha, Villa Mercedes..." → "Soacha".
    /// </summary>
    private static string DerivarMunicipio(string? ubicacionTexto)
    {
        if (string.IsNullOrWhiteSpace(ubicacionTexto))
        {
            return "Sin especificar";
        }

        string primerSegmento = ubicacionTexto.Split(',')[0].Trim();
        if (string.IsNullOrWhiteSpace(primerSegmento))
        {
            return "Sin especificar";
        }

        // Municipio tiene HasMaxLength(120); UbicacionTexto sin comas puede llegar a 300.
        return primerSegmento.Length > 120 ? primerSegmento[..120] : primerSegmento;
    }

    private static bool ViolaIndiceUnico(DbUpdateException ex) =>
        ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation };
}
