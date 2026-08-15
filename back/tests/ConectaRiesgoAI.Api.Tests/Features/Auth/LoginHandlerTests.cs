using ConectaRiesgoAI.Api.Common.Auth;
using ConectaRiesgoAI.Api.Common.Errors;
using ConectaRiesgoAI.Api.Domain.Entities;
using ConectaRiesgoAI.Api.Domain.Enums;
using ConectaRiesgoAI.Api.Features.Auth.Login;
using ConectaRiesgoAI.Api.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace ConectaRiesgoAI.Api.Tests.Features.Auth;

public class LoginHandlerTests
{
    private const string PasswordCorrecta = "unaClaveSegura123";

    private static readonly OpcionesJwt OpcionesJwt = new()
    {
        Secret = "clave-de-pruebas-unicamente-no-usar-en-produccion-32+",
        Issuer = "ConectaRiesgoAI.Tests",
        Audience = "ConectaRiesgoAI.Tests"
    };

    private static async Task<AppDbContext> NuevoContextoConUsuarioAsync()
    {
        var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

        db.Usuarios.Add(new Usuario
        {
            Nombre = "María Rodríguez",
            Email = "maria@ejemplo.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(PasswordCorrecta),
            Rol = Rol.Ciudadano,
            Municipio = "Bogotá"
        });
        await db.SaveChangesAsync();

        return db;
    }

    private static LoginHandler NuevoHandler(AppDbContext db) =>
        new(db, new GeneradorTokenJwt(Options.Create(OpcionesJwt)));

    [Fact]
    public async Task Handle_CredencialesCorrectas_DevuelveTokenYUsuario()
    {
        using var db = await NuevoContextoConUsuarioAsync();
        var handler = NuevoHandler(db);

        var respuesta = await handler.Handle(new LoginCommand("maria@ejemplo.com", PasswordCorrecta), CancellationToken.None);

        Assert.False(string.IsNullOrWhiteSpace(respuesta.Token));
        Assert.Equal("maria@ejemplo.com", respuesta.Usuario.Email);
    }

    [Fact]
    public async Task Handle_PasswordIncorrecta_LanzaCredencialesInvalidas()
    {
        using var db = await NuevoContextoConUsuarioAsync();
        var handler = NuevoHandler(db);

        await Assert.ThrowsAsync<CredencialesInvalidasException>(
            () => handler.Handle(new LoginCommand("maria@ejemplo.com", "otraClaveDistinta"), CancellationToken.None));
    }

    [Fact]
    public async Task Handle_EmailNoExiste_LanzaCredencialesInvalidas()
    {
        using var db = await NuevoContextoConUsuarioAsync();
        var handler = NuevoHandler(db);

        await Assert.ThrowsAsync<CredencialesInvalidasException>(
            () => handler.Handle(new LoginCommand("nadie@ejemplo.com", PasswordCorrecta), CancellationToken.None));
    }
}
