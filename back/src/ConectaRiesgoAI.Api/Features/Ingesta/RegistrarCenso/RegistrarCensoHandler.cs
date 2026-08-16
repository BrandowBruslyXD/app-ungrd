using ConectaRiesgoAI.Api.Domain.Entities;
using ConectaRiesgoAI.Api.Domain.Enums;
using ConectaRiesgoAI.Api.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace ConectaRiesgoAI.Api.Features.Ingesta.RegistrarCenso;

/// <summary>
/// Registra a una <see cref="PersonaAfectada"/> dentro de la <see cref="OperacionCenso"/> abierta
/// del brigadista, reutilizando el modelo ya documentado en docs/MODELO-DATOS.md (ver issue #48).
/// Las dos validaciones que no son opcionales —consentimiento y acreditación del brigadista— se
/// resuelven antes de tocar cualquier otra cosa: la protección del dato no puede depender de que
/// el resto del flujo esté bien armado.
/// </summary>
public class RegistrarCensoHandler(AppDbContext db, ILogger<RegistrarCensoHandler> logger)
    : IRequestHandler<RegistrarCensoCommand, RegistrarCensoResponse>
{
    private const int MaximoIntentos = 3;

    public async Task<RegistrarCensoResponse> Handle(RegistrarCensoCommand command, CancellationToken cancellationToken)
    {
        // El validador ya bloqueó Consentimiento == false con un 400 antes de llegar aquí
        // (ver RegistrarCensoValidator): el handler nunca alcanza a tocar el DbContext en ese
        // caso, así que no hay nada que revertir ni que loguear con el nombre de la persona.
        string telefono = command.Telefono.Trim();
        Usuario? brigadista = await db.Usuarios.SingleOrDefaultAsync(u => u.Telefono == telefono, cancellationToken);

        if (brigadista is null || !brigadista.EsAcreditadoCenso)
        {
            // El rol no se pregunta, se acredita (art. 7, Res. 1110 de 2022): preguntarle a
            // alguien si es brigadista es una invitación al fraude censal. Se deja constancia
            // (sin el nombre de nadie, el teléfono ya es el identificador de la solicitud) para
            // poder detectar un patrón de intentos repetidos.
            logger.LogWarning("Intento de registro censal con teléfono no acreditado: {Telefono}", telefono);
            throw new UnauthorizedAccessException("El teléfono no está acreditado para registrar el censo");
        }

        OperacionCenso operacion = await ObtenerOAbrirOperacion(command.Municipio, command.BarrioVereda, brigadista, cancellationToken);
        string? cedula = string.IsNullOrWhiteSpace(command.NumeroDocumento) ? null : command.NumeroDocumento.Trim();

        PersonaAfectada persona = null!;
        for (int intento = 1; intento <= MaximoIntentos; intento++)
        {
            // Repetido en cada intento, no solo antes del bucle: si dos registros con la misma
            // cédula chocan a la vez, el primer SaveChangesAsync que pierde la carrera viola el
            // índice único de (OperacionCensoId, NumeroDocumento), no el de Codigo, y el catch de
            // abajo no distingue cuál — sin este recálculo, el segundo intento agotaría los
            // reintentos contra el mismo choque y terminaría en un 500 en vez de un 400 claro.
            if (cedula is not null)
            {
                bool yaRegistrada = await db.PersonasAfectadas.AnyAsync(
                    p => p.OperacionCensoId == operacion.Id && p.NumeroDocumento == cedula, cancellationToken);
                if (yaRegistrada)
                {
                    // Mensaje genérico a propósito: no interpolar la cédula. El mensaje de una
                    // excepción puede terminar en un APM o en telemetría sin que nadie haya
                    // escrito un logger.Log* con datos personales (ver CLAUDE.md).
                    throw new InvalidOperationException("La persona ya está registrada en este evento censal");
                }
            }

            DateTime ahora = DateTime.UtcNow;
            string prefijo = $"DMN-{ahora:yyyy-MM-dd}-";
            int consecutivo = await db.PersonasAfectadas.CountAsync(
                p => p.Codigo.StartsWith(prefijo), cancellationToken) + 1;

            persona = new PersonaAfectada
            {
                Codigo = PersonaAfectada.GenerarCodigo(ahora, consecutivo),
                OperacionCensoId = operacion.Id,
                RegistradoPorId = brigadista.Id,
                Nombres = command.Nombres.Trim(),
                Apellidos = command.Apellidos.Trim(),
                TipoDocumento = command.TipoDocumento,
                NumeroDocumento = cedula,
                Edad = command.Edad,
                Genero = command.Genero,
                Telefono = command.TelefonoContacto?.Trim(),
                Departamento = command.Departamento.Trim(),
                Ciudad = command.Ciudad.Trim(),
                DireccionResidencia = command.DireccionResidencia.Trim(),
                Latitud = command.Latitud,
                Longitud = command.Longitud,
                EsCabezaDeHogar = command.EsCabezaDeHogar,
                TieneDiscapacidad = command.TieneDiscapacidad,
                EsAdultoMayor = command.EsAdultoMayor,
                EstaEmbarazada = command.EstaEmbarazada,
                PerteneceGrupoEtnico = command.PerteneceGrupoEtnico,
                EsVictimaConflicto = command.EsVictimaConflicto,
                RequiereAtencionMedica = command.RequiereAtencionMedica,
                DeclaracionVeracidad = command.DeclaracionVeracidad,
                FechaDeclaracion = ahora,
                ConsentimientoDatos = command.Consentimiento,
                // El bot captura una versión reducida del EDAN; el brigadista completa el resto
                // después desde el frontend (fuera de alcance del issue #48).
                Estado = EstadoPersonaAfectada.Borrador
            };

            if (!string.IsNullOrWhiteSpace(command.EstadoVivienda))
            {
                persona.Danos.Add(new DanoRegistrado
                {
                    Categoria = CategoriaDano.Vivienda,
                    Nivel = MapeoNivelDanoVivienda.Aproximar(command.EstadoVivienda),
                    Descripcion = ArmarDescripcionDano(command)
                });
            }

            foreach (MiembroNucleoFamiliarInput miembro in command.MiembrosNucleo ?? [])
            {
                persona.NucleoFamiliar.Add(new MiembroNucleoFamiliar
                {
                    Nombres = miembro.Nombres.Trim(),
                    Apellidos = miembro.Apellidos.Trim(),
                    Parentesco = miembro.Parentesco,
                    Edad = miembro.Edad,
                    TipoDocumento = miembro.TipoDocumento,
                    NumeroDocumento = string.IsNullOrWhiteSpace(miembro.NumeroDocumento) ? null : miembro.NumeroDocumento.Trim(),
                    TieneDiscapacidad = miembro.TieneDiscapacidad,
                    EstudiaActualmente = miembro.EstudiaActualmente
                });
            }

            db.PersonasAfectadas.Add(persona);

            try
            {
                await db.SaveChangesAsync(cancellationToken);
                break;
            }
            catch (DbUpdateException ex) when (ViolaIndiceUnicoDeCodigo(ex) && intento < MaximoIntentos)
            {
                // Dos registros del mismo día calcularon el mismo consecutivo: se descarta el
                // intento y se recalcula. Cualquier otro fallo sigue de largo hasta
                // ManejadorGlobalDeErrores, que lo loguea como el 500 que es.
                db.PersonasAfectadas.Remove(persona);
            }
        }

        // Solo el código: los logs llevan identificadores, no contenido (nunca nombre ni documento).
        logger.LogInformation("Persona afectada registrada en el censo: {Codigo}", persona.Codigo);
        return new RegistrarCensoResponse(persona.Codigo, operacion.Codigo, persona.Estado);
    }

    /// <summary>
    /// Reutiliza la jornada de censo abierta del brigadista en ese municipio; si no hay una, abre
    /// una nueva. Con el mismo reintento ante colisión de código único que se usa más abajo para
    /// <see cref="PersonaAfectada"/>.
    /// </summary>
    private async Task<OperacionCenso> ObtenerOAbrirOperacion(
        string municipio, string? barrioVereda, Usuario brigadista, CancellationToken cancellationToken)
    {
        string municipioNormalizado = municipio.Trim();

        OperacionCenso? existente = await db.OperacionesCenso.SingleOrDefaultAsync(
            o => o.Municipio == municipioNormalizado && o.BrigadistaId == brigadista.Id && o.CerradaEn == null,
            cancellationToken);
        if (existente is not null)
        {
            return existente;
        }

        for (int intento = 1; intento <= MaximoIntentos; intento++)
        {
            DateTime ahora = DateTime.UtcNow;
            string prefijo = $"CEN-{ahora:yyyy-MM-dd}-";
            int consecutivo = await db.OperacionesCenso.CountAsync(
                o => o.Codigo.StartsWith(prefijo), cancellationToken) + 1;

            OperacionCenso operacion = new()
            {
                Codigo = OperacionCenso.GenerarCodigo(ahora, consecutivo),
                Municipio = municipioNormalizado,
                BarrioVereda = barrioVereda?.Trim(),
                BrigadistaId = brigadista.Id,
                AbiertaEn = ahora
            };

            db.OperacionesCenso.Add(operacion);

            try
            {
                await db.SaveChangesAsync(cancellationToken);
                return operacion;
            }
            catch (DbUpdateException ex) when (ViolaIndiceUnicoDeCodigo(ex) && intento < MaximoIntentos)
            {
                db.OperacionesCenso.Remove(operacion);
            }
        }

        // Dos brigadistas concurrentes en el mismo municipio abrieron la jornada a la vez: quien
        // perdió la carrera reutiliza la que sí quedó guardada.
        return await db.OperacionesCenso.SingleAsync(
            o => o.Municipio == municipioNormalizado && o.BrigadistaId == brigadista.Id && o.CerradaEn == null,
            cancellationToken);
    }

    private static string ArmarDescripcionDano(RegistrarCensoCommand command)
    {
        List<string> partes = [command.EstadoVivienda!.Trim()];
        if (!string.IsNullOrWhiteSpace(command.Necesidad))
        {
            partes.Add($"Necesidad: {command.Necesidad.Trim()}");
        }

        return string.Join(" | ", partes);
    }

    private static bool ViolaIndiceUnicoDeCodigo(DbUpdateException ex) =>
        ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation };
}
