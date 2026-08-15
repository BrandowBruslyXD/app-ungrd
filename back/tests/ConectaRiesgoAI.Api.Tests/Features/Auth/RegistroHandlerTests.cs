using ConectaRiesgoAI.Api.Common.Auth;
using ConectaRiesgoAI.Api.Domain.Entities;
using ConectaRiesgoAI.Api.Domain.Enums;
using ConectaRiesgoAI.Api.Features.Auth.Registro;
using ConectaRiesgoAI.Api.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

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
        new(db, new GeneradorTokenJwt(Options.Create(OpcionesJwt)));

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
}
