using ConectaRiesgoAI.Api.Common.Auth;
using ConectaRiesgoAI.Api.Domain.Entities;
using ConectaRiesgoAI.Api.Domain.Enums;
using ConectaRiesgoAI.Api.Features.Auth.Registro;
using ConectaRiesgoAI.Api.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Npgsql;

namespace ConectaRiesgoAI.Api.Tests.Features.Auth;

public class RegistroHandlerTests
{
    private static readonly OpcionesJwt OpcionesJwt = new()
    {
        Secret = "clave-de-pruebas-unicamente-no-usar-en-produccion-32+",
        Issuer = "ConectaRiesgoAI.Tests",
        Audience = "ConectaRiesgoAI.Tests"
    };

    private static AppDbContext NuevoContexto() => new(
        new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static RegistroHandler NuevoHandler(AppDbContext db) =>
        new(db, new GeneradorTokenJwt(Options.Create(OpcionesJwt)), NullLogger<RegistroHandler>.Instance);

    [Fact]
    public async Task Handle_EmailNuevo_CreaUsuarioConRolCiudadano()
    {
        using var db = NuevoContexto();
        var handler = NuevoHandler(db);
        var comando = new RegistroCommand("María Rodríguez", "maria@ejemplo.com", "unaClaveSegura123", "Bogotá");

        var respuesta = await handler.Handle(comando, CancellationToken.None);

        Assert.Equal(Rol.Ciudadano, respuesta.Usuario.Rol);
        Assert.Equal("maria@ejemplo.com", respuesta.Usuario.Email);
        Assert.False(string.IsNullOrWhiteSpace(respuesta.Token));
        Assert.Equal(1, await db.Usuarios.CountAsync());
    }

    [Fact]
    public async Task Handle_EmailNuevo_GuardaLaContraseñaComoHashNoEnTextoPlano()
    {
        using var db = NuevoContexto();
        var handler = NuevoHandler(db);
        var comando = new RegistroCommand("María Rodríguez", "maria@ejemplo.com", "unaClaveSegura123", "Bogotá");

        await handler.Handle(comando, CancellationToken.None);

        var usuario = await db.Usuarios.SingleAsync();
        Assert.NotEqual(comando.Password, usuario.PasswordHash);
        Assert.True(BCrypt.Net.BCrypt.Verify(comando.Password, usuario.PasswordHash));
    }

    [Fact]
    public async Task Handle_EmailYaRegistrado_LanzaInvalidOperationException()
    {
        using var db = NuevoContexto();
        db.Usuarios.Add(new Usuario
        {
            Nombre = "Ya Existe",
            Email = "maria@ejemplo.com",
            PasswordHash = "hash",
            Rol = Rol.Ciudadano,
            Municipio = "Bogotá"
        });
        await db.SaveChangesAsync();
        var handler = NuevoHandler(db);
        var comando = new RegistroCommand("María Rodríguez", "maria@ejemplo.com", "unaClaveSegura123", "Bogotá");

        await Assert.ThrowsAsync<InvalidOperationException>(() => handler.Handle(comando, CancellationToken.None));
    }

    /// <summary>
    /// InMemory no hace cumplir <c>HasIndex(...).IsUnique()</c> (a diferencia de Postgres): dos
    /// registros con el mismo correo se guardan sin quejarse. Este contexto lanza en el
    /// <c>SaveChanges</c> lo que le pidas, para poder probar el <c>catch</c> del handler con la
    /// forma exacta que arma Postgres (y con cualquier otra, para probar que esas sí lo atraviesan).
    /// </summary>
    private sealed class ContextoQueFallaAlGuardar(DbContextOptions<AppDbContext> options, DbUpdateException porLanzar)
        : AppDbContext(options)
    {
        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) =>
            throw porLanzar;
    }

    private static DbUpdateException ExcepcionDeViolacionDeIndiceUnico() => new(
        "23505: duplicate key value violates unique constraint",
        new PostgresException("duplicate key value violates unique constraint \"IX_usuarios_Email\"",
            "ERROR", "ERROR", PostgresErrorCodes.UniqueViolation));

    [Fact]
    public async Task Handle_ElGuardadoViolaElIndiceUnicoDeEmail_LanzaInvalidOperationException()
    {
        using var db = new ContextoQueFallaAlGuardar(
            new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options,
            ExcepcionDeViolacionDeIndiceUnico());
        var handler = NuevoHandler(db);
        var comando = new RegistroCommand("María Rodríguez", "carrera@ejemplo.com", "unaClaveSegura123", "Bogotá");

        var error = await Assert.ThrowsAsync<InvalidOperationException>(
            () => handler.Handle(comando, CancellationToken.None));
        Assert.Equal("El correo ya está registrado", error.Message);
    }

    [Fact]
    public async Task Handle_ElGuardadoFallaPorOtraRazon_NoLoDisfrazaDeCorreoDuplicado()
    {
        // Un DbUpdateException que no viene del índice único de Email (conexión caída, otra
        // restricción) no debe traducirse al 400 de "correo ya registrado": eso ocultaría el
        // problema real. Tiene que seguir de largo tal cual, para que ManejadorGlobalDeErrores
        // lo loguee como el 500 que es.
        using var db = new ContextoQueFallaAlGuardar(
            new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options,
            new DbUpdateException("La conexión con la base de datos se perdió."));
        var handler = NuevoHandler(db);
        var comando = new RegistroCommand("María Rodríguez", "otra-falla@ejemplo.com", "unaClaveSegura123", "Bogotá");

        await Assert.ThrowsAsync<DbUpdateException>(() => handler.Handle(comando, CancellationToken.None));
    }
}
