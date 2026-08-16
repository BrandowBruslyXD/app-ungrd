using ConectaRiesgoAI.Api.Domain.Entities;
using ConectaRiesgoAI.Api.Domain.Enums;
using ConectaRiesgoAI.Api.Features.Ingesta.RegistrarCenso;
using ConectaRiesgoAI.Api.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace ConectaRiesgoAI.Api.Tests.Features.Ingesta.RegistrarCenso;

public class RegistrarCensoHandlerTests
{
    private const string TelefonoBrigadista = "573001234567";

    private static AppDbContext NuevoContexto() => new(
        new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static RegistrarCensoHandler NuevoHandler(AppDbContext db) =>
        new(db, NullLogger<RegistrarCensoHandler>.Instance);

    private static async Task<Usuario> AgregarBrigadistaAcreditado(AppDbContext db, string telefono = TelefonoBrigadista)
    {
        var brigadista = new Usuario
        {
            Nombre = "Carlos Brigadista",
            Email = $"wa-{telefono}@ingesta.conectariesgoai.local",
            PasswordHash = "hash",
            Rol = Rol.Ciudadano,
            Municipio = "Soacha",
            Telefono = telefono,
            EsAcreditadoCenso = true,
            OrigenRegistro = CanalOrigen.WhatsApp
        };
        db.Usuarios.Add(brigadista);
        await db.SaveChangesAsync();
        return brigadista;
    }

    private static RegistrarCensoCommand Comando(
        string telefono = TelefonoBrigadista,
        bool consentimiento = true,
        string? numeroDocumento = "1234567890",
        IReadOnlyList<MiembroNucleoFamiliarInput>? miembros = null) =>
        new(
            Telefono: telefono,
            Municipio: "Soacha",
            BarrioVereda: "Villa Mercedes",
            Consentimiento: consentimiento,
            DeclaracionVeracidad: true,
            Nombres: "María",
            Apellidos: "Ramírez",
            TipoDocumento: TipoDocumentoPersona.CC,
            NumeroDocumento: numeroDocumento,
            Edad: 34,
            Genero: GeneroPersona.Femenino,
            TelefonoContacto: null,
            Departamento: "Cundinamarca",
            Ciudad: "Soacha",
            DireccionResidencia: "Villa Mercedes, casa 12",
            Latitud: null,
            Longitud: null,
            EsCabezaDeHogar: true,
            TieneDiscapacidad: false,
            EsAdultoMayor: false,
            EstaEmbarazada: false,
            PerteneceGrupoEtnico: null,
            EsVictimaConflicto: false,
            RequiereAtencionMedica: false,
            EstadoVivienda: "Averiada — NO habitable",
            Necesidad: "AHE alimentaria",
            MiembrosNucleo: miembros);

    [Fact]
    public async Task Handle_ConsentimientoTrueYAcreditado_CreaPersonaAfectadaEnOperacionCenso()
    {
        using var db = NuevoContexto();
        await AgregarBrigadistaAcreditado(db);
        var handler = NuevoHandler(db);

        var respuesta = await handler.Handle(Comando(), CancellationToken.None);

        Assert.StartsWith("DMN-", respuesta.Codigo);
        Assert.StartsWith("CEN-", respuesta.CodigoOperacionCenso);
        Assert.Equal(EstadoPersonaAfectada.Borrador, respuesta.Estado);

        var persona = await db.PersonasAfectadas.Include(p => p.Danos).SingleAsync();
        Assert.True(persona.ConsentimientoDatos);
        Assert.Equal(CategoriaDano.Vivienda, persona.Danos.Single().Categoria);

        var operacion = await db.OperacionesCenso.SingleAsync();
        Assert.Equal("Soacha", operacion.Municipio);
        Assert.Equal(persona.OperacionCensoId, operacion.Id);
    }

    [Fact]
    public async Task Handle_NecesidadSinEstadoVivienda_PersisteElDano()
    {
        using var db = NuevoContexto();
        await AgregarBrigadistaAcreditado(db);
        var handler = NuevoHandler(db);
        var comando = Comando() with { EstadoVivienda = null, Necesidad = "Agua potable urgente" };

        await handler.Handle(comando, CancellationToken.None);

        var persona = await db.PersonasAfectadas.Include(p => p.Danos).SingleAsync();
        var dano = Assert.Single(persona.Danos);
        Assert.Equal(CategoriaDano.Vivienda, dano.Categoria);
        Assert.Equal(NivelDano.Moderado, dano.Nivel);
        Assert.Equal("Necesidad: Agua potable urgente", dano.Descripcion);
    }

    [Fact]
    public async Task Handle_SinEstadoViviendaNiNecesidad_NoCreaDano()
    {
        using var db = NuevoContexto();
        await AgregarBrigadistaAcreditado(db);
        var handler = NuevoHandler(db);
        var comando = Comando() with { EstadoVivienda = null, Necesidad = null };

        await handler.Handle(comando, CancellationToken.None);

        var persona = await db.PersonasAfectadas.Include(p => p.Danos).SingleAsync();
        Assert.Empty(persona.Danos);
    }

    [Fact]
    public async Task Handle_DosRegistrosMismoBrigadistaYMunicipio_ReutilizaLaMismaOperacionCenso()
    {
        using var db = NuevoContexto();
        await AgregarBrigadistaAcreditado(db);
        var handler = NuevoHandler(db);

        await handler.Handle(Comando(numeroDocumento: "1111111111"), CancellationToken.None);
        await handler.Handle(Comando(numeroDocumento: "2222222222"), CancellationToken.None);

        Assert.Equal(1, await db.OperacionesCenso.CountAsync());
        Assert.Equal(2, await db.PersonasAfectadas.CountAsync());
    }

    [Fact]
    public async Task Handle_ConMiembrosDeNucleoFamiliar_LosPersisteAsociados()
    {
        using var db = NuevoContexto();
        await AgregarBrigadistaAcreditado(db);
        var handler = NuevoHandler(db);
        var miembros = new List<MiembroNucleoFamiliarInput>
        {
            new("Juan", "Ramírez", ParentescoFamiliar.Hijo, 8, null, null, false, true)
        };

        await handler.Handle(Comando(miembros: miembros), CancellationToken.None);

        var persona = await db.PersonasAfectadas.Include(p => p.NucleoFamiliar).SingleAsync();
        Assert.Single(persona.NucleoFamiliar);
        Assert.Equal(ParentescoFamiliar.Hijo, persona.NucleoFamiliar.Single().Parentesco);
    }

    [Fact]
    public async Task Handle_TelefonoNoAcreditado_LanzaUnauthorizedAccessExceptionYNoPersisteNada()
    {
        using var db = NuevoContexto();
        db.Usuarios.Add(new Usuario
        {
            Nombre = "Sin Acreditar",
            Email = "wa-573009999999@ingesta.conectariesgoai.local",
            PasswordHash = "hash",
            Rol = Rol.Ciudadano,
            Municipio = "Soacha",
            Telefono = "573009999999",
            EsAcreditadoCenso = false,
            OrigenRegistro = CanalOrigen.WhatsApp
        });
        await db.SaveChangesAsync();
        var handler = NuevoHandler(db);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => handler.Handle(Comando(telefono: "573009999999"), CancellationToken.None));

        Assert.Equal(0, await db.PersonasAfectadas.CountAsync());
        Assert.Equal(0, await db.OperacionesCenso.CountAsync());
    }

    [Fact]
    public async Task Handle_TelefonoSinUsuario_LanzaUnauthorizedAccessException()
    {
        using var db = NuevoContexto();
        var handler = NuevoHandler(db);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => handler.Handle(Comando(telefono: "573000000000"), CancellationToken.None));

        Assert.Equal(0, await db.PersonasAfectadas.CountAsync());
    }

    [Fact]
    public async Task Handle_CedulaRepetidaEnMismoEvento_LanzaInvalidOperationExceptionYNoDuplica()
    {
        using var db = NuevoContexto();
        await AgregarBrigadistaAcreditado(db);
        var handler = NuevoHandler(db);
        await handler.Handle(Comando(numeroDocumento: "999888777"), CancellationToken.None);

        var excepcion = await Assert.ThrowsAsync<InvalidOperationException>(
            () => handler.Handle(Comando(numeroDocumento: "999888777"), CancellationToken.None));

        Assert.Equal(1, await db.PersonasAfectadas.CountAsync());
        // El mensaje llega tal cual al cliente (ManejadorGlobalDeErrores): nunca debe traer la
        // cédula, para que no quede expuesta en telemetría o en un log de terceros.
        Assert.DoesNotContain("999888777", excepcion.Message);
    }

    [Fact]
    public async Task Handle_CedulaRepetidaEnOtraOperacionCenso_NoSeRechaza()
    {
        using var db = NuevoContexto();
        await AgregarBrigadistaAcreditado(db);
        await AgregarBrigadistaAcreditado(db, "573005555555");
        var handler = NuevoHandler(db);

        await handler.Handle(Comando(numeroDocumento: "555444333"), CancellationToken.None);
        var comandoOtroMunicipio = Comando(telefono: "573005555555", numeroDocumento: "555444333") with
        {
            Municipio = "Chía"
        };

        await handler.Handle(comandoOtroMunicipio, CancellationToken.None);

        Assert.Equal(2, await db.PersonasAfectadas.CountAsync());
    }
}
