using ConectaRiesgoAI.Api.Common.Reportes;
using ConectaRiesgoAI.Api.Domain.Entities;
using ConectaRiesgoAI.Api.Domain.Enums;
using ConectaRiesgoAI.Api.Persistence;
using ConectaRiesgoAI.Api.Tests.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace ConectaRiesgoAI.Api.Tests.Features.Reportes;

/// <summary>
/// Criterios de aceptación del issue #55: identidad de canal, idempotencia y unificación por teléfono.
/// </summary>
public class ReporteIdentidadCanalTests
{
    private static AppDbContext NuevoContexto() => new(
        new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static ResolutorUsuarioPorTelefono NuevoResolutor(AppDbContext db) =>
        new(db, NullLogger<ResolutorUsuarioPorTelefono>.Instance);

    private static BuscadorReporteIdempotente NuevoBuscador(AppDbContext db) => new(db);

    [Fact]
    public async Task Guardar_ReporteWhatsapp_PersisteCanalIdentificadorYReferenciaExterna()
    {
        using var db = NuevoContexto();
        var usuario = new Usuario
        {
            Nombre = "María Rodríguez",
            Email = "wa-573001234567@ingesta.conectariesgoai.local",
            PasswordHash = "hash",
            Municipio = "Soacha",
            Telefono = "573001234567",
            OrigenRegistro = CanalOrigen.WhatsApp
        };
        db.Usuarios.Add(usuario);
        await db.SaveChangesAsync();

        var reporte = new Reporte
        {
            Codigo = "RPT-2026-08-16-0001",
            Tipo = TipoReporte.Inundacion,
            Descripcion = "Se inundó la casa",
            Municipio = "Soacha",
            UbicacionTexto = "Villa Mercedes",
            Canal = CanalOrigen.WhatsApp,
            IdentificadorCanal = IdentificadorCanalReporte.ParaTelefono("573001234567"),
            ReferenciaExterna = "wamid.ABC",
            Usuario = usuario
        };
        db.Reportes.Add(reporte);
        await db.SaveChangesAsync();

        var guardado = await db.Reportes.SingleAsync();
        Assert.Equal(CanalOrigen.WhatsApp, guardado.Canal);
        Assert.Equal("573001234567", guardado.IdentificadorCanal);
        Assert.Equal("wamid.ABC", guardado.ReferenciaExterna);
    }

    [Fact]
    public async Task Guardar_ReporteDesdeLaWeb_ReferenciaExternaQuedaNula()
    {
        using var db = NuevoContexto();
        var usuario = new Usuario
        {
            Nombre = "Ana Ciudadana",
            Email = "ana@ejemplo.com",
            PasswordHash = "hash",
            Municipio = "Bogotá"
        };
        db.Usuarios.Add(usuario);
        await db.SaveChangesAsync();

        var reporte = new Reporte
        {
            Codigo = "RPT-2026-08-16-0002",
            Tipo = TipoReporte.Incendio,
            Descripcion = "Incendio forestal",
            Municipio = "Bogotá",
            Latitud = 4.710989,
            Longitud = -74.072092,
            Canal = CanalOrigen.Web,
            IdentificadorCanal = IdentificadorCanalReporte.ParaWeb(usuario.Id),
            ReferenciaExterna = null,
            Usuario = usuario
        };
        db.Reportes.Add(reporte);
        await db.SaveChangesAsync();

        var guardado = await db.Reportes.SingleAsync();
        Assert.Equal(CanalOrigen.Web, guardado.Canal);
        Assert.Equal($"usuario:{usuario.Id}", guardado.IdentificadorCanal);
        Assert.Null(guardado.ReferenciaExterna);
    }

    [Fact]
    public async Task BuscarExistente_ReferenciaExternaDuplicada_DevuelveElReportePrevio()
    {
        using var db = NuevoContexto();
        var usuario = new Usuario
        {
            Nombre = "Pedro López",
            Email = "pedro@ejemplo.com",
            PasswordHash = "hash",
            Municipio = "Medellín",
            Telefono = "573009876543"
        };
        db.Usuarios.Add(usuario);
        await db.SaveChangesAsync();

        db.Reportes.Add(new Reporte
        {
            Codigo = "RPT-2026-08-16-0100",
            Tipo = TipoReporte.Otro,
            Descripcion = "Primera llamada",
            Municipio = "Medellín",
            Canal = CanalOrigen.Telefono,
            IdentificadorCanal = IdentificadorCanalReporte.ParaTelefono("573009876543"),
            ReferenciaExterna = "dapta-call-123",
            Usuario = usuario
        });
        await db.SaveChangesAsync();

        var buscador = NuevoBuscador(db);
        Reporte? existente = await buscador.BuscarExistenteAsync(
            CanalOrigen.Telefono,
            "dapta-call-123",
            CancellationToken.None);

        Assert.NotNull(existente);
        Assert.Equal("RPT-2026-08-16-0100", existente.Codigo);
    }

    [Fact]
    public async Task ResolverUsuario_MismoTelefonoEnTelefonoYWhatsapp_DevuelveElMismoUsuario()
    {
        using var db = NuevoContexto();
        var resolutor = NuevoResolutor(db);

        Usuario porLlamada = await resolutor.ResolverOCrearAsync(
            "573001234567",
            CanalOrigen.Telefono,
            "María R.",
            "Soacha",
            CancellationToken.None);

        Usuario porWhatsapp = await resolutor.ResolverOCrearAsync(
            "573001234567",
            CanalOrigen.WhatsApp,
            "María R.",
            "Soacha",
            CancellationToken.None);

        Assert.Equal(porLlamada.Id, porWhatsapp.Id);
        Assert.Equal(1, await db.Usuarios.CountAsync());

        db.Reportes.Add(new Reporte
        {
            Codigo = "RPT-2026-08-16-0201",
            Tipo = TipoReporte.Inundacion,
            Descripcion = "Por llamada",
            Municipio = "Soacha",
            Canal = CanalOrigen.Telefono,
            IdentificadorCanal = IdentificadorCanalReporte.ParaTelefono("573001234567"),
            ReferenciaExterna = "dapta-call-aaa",
            UsuarioId = porLlamada.Id
        });
        db.Reportes.Add(new Reporte
        {
            Codigo = "RPT-2026-08-16-0202",
            Tipo = TipoReporte.Inundacion,
            Descripcion = "Por WhatsApp",
            Municipio = "Soacha",
            Canal = CanalOrigen.WhatsApp,
            IdentificadorCanal = IdentificadorCanalReporte.ParaTelefono("573001234567"),
            ReferenciaExterna = "wamid.XYZ",
            UsuarioId = porWhatsapp.Id
        });
        await db.SaveChangesAsync();

        int[] usuariosDeReportes = await db.Reportes.Select(r => r.UsuarioId).ToArrayAsync();
        Assert.Equal(usuariosDeReportes[0], usuariosDeReportes[1]);
    }

    [Fact]
    public async Task ResolverOCrear_Telefono_UsaPrefijoTelEnEmail()
    {
        using var db = NuevoContexto();
        var resolutor = NuevoResolutor(db);

        Usuario usuario = await resolutor.ResolverOCrearAsync(
            "573009998877",
            CanalOrigen.Telefono,
            "Pedro L.",
            "Medellín",
            CancellationToken.None);

        Assert.StartsWith("tel-", usuario.Email);
    }

    [Fact]
    public async Task ResolverOCrear_Whatsapp_UsaPrefijoWaEnEmail()
    {
        using var db = NuevoContexto();
        var resolutor = NuevoResolutor(db);

        Usuario usuario = await resolutor.ResolverOCrearAsync(
            "573008887766",
            CanalOrigen.WhatsApp,
            "Ana L.",
            "Cali",
            CancellationToken.None);

        Assert.StartsWith("wa-", usuario.Email);
    }

    /// <summary>
    /// SQLite aplica el índice único de teléfono. Simula la carrera de dos webhooks concurrentes
    /// y verifica que, tras la colisión, el contexto puede seguir guardando sin reintentar el insert.
    /// </summary>
    [Fact]
    public async Task ResolverOCrear_ColisionDeTelefono_DesvinculaElInsertFallidoYPermiteSeguirGuardando()
    {
        var (contexto, conexion) = AppDbContextSqlitePruebas.Crear();
        using var contextoDesechable = contexto;
        using var conexionDesechable = conexion;

        var opciones = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(conexion)
            .Options;

        Task<Usuario> primera = new ResolutorUsuarioPorTelefono(
            new AppDbContext(opciones),
            NullLogger<ResolutorUsuarioPorTelefono>.Instance)
            .ResolverOCrearAsync("573001111222", CanalOrigen.WhatsApp, "A", "Bogotá", CancellationToken.None);

        Task<Usuario> segunda = new ResolutorUsuarioPorTelefono(
            new AppDbContext(opciones),
            NullLogger<ResolutorUsuarioPorTelefono>.Instance)
            .ResolverOCrearAsync("573001111222", CanalOrigen.Telefono, "A", "Bogotá", CancellationToken.None);

        Usuario[] usuarios = await Task.WhenAll(primera, segunda);

        Assert.Equal(usuarios[0].Id, usuarios[1].Id);
        Assert.Equal(1, await contexto.Usuarios.CountAsync(u => u.Telefono == "573001111222"));

        var resolutor = NuevoResolutor(contexto);
        Usuario resuelto = await resolutor.ResolverOCrearAsync(
            "573001111222", CanalOrigen.WhatsApp, "A", "Bogotá", CancellationToken.None);

        contexto.Reportes.Add(new Reporte
        {
            Codigo = "RPT-2026-08-16-0300",
            Tipo = TipoReporte.Otro,
            Descripcion = "Tras colisión",
            Municipio = "Bogotá",
            Canal = CanalOrigen.WhatsApp,
            IdentificadorCanal = IdentificadorCanalReporte.ParaTelefono("573001111222"),
            ReferenciaExterna = "wamid-post-collision",
            UsuarioId = resuelto.Id
        });

        await contexto.SaveChangesAsync();
        Assert.Equal(1, await contexto.Reportes.CountAsync());
    }

    /// <summary>
    /// InMemory no aplica filtros parciales; esto blinda que EF siga declarando el índice como en Postgres.
    /// </summary>
    [Fact]
    public void Configure_CanalYReferenciaExterna_QuedaConIndiceUnicoParcial()
    {
        using var db = NuevoContexto();

        var indice = db.Model.FindEntityType(typeof(Reporte))!
            .GetIndexes()
            .Single(i =>
                i.Properties.Select(p => p.Name).SequenceEqual(new[] { nameof(Reporte.Canal), nameof(Reporte.ReferenciaExterna) }));

        Assert.True(indice.IsUnique);
        Assert.Equal("\"ReferenciaExterna\" IS NOT NULL", indice.GetFilter());
        Assert.Equal(IndicesPostgres.ReportesCanalReferenciaExterna, indice.GetDatabaseName());
    }

    [Fact]
    public void IdentificadorCanalReporte_ParaWeb_FormateaConPrefijoUsuario()
    {
        Assert.Equal("usuario:12", IdentificadorCanalReporte.ParaWeb(12));
    }
}
