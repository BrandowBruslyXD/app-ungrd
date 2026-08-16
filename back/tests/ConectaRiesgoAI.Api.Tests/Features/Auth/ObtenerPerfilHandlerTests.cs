using ConectaRiesgoAI.Api.Common.Auth;
using ConectaRiesgoAI.Api.Domain.Entities;
using ConectaRiesgoAI.Api.Domain.Enums;
using ConectaRiesgoAI.Api.Features.Auth;
using ConectaRiesgoAI.Api.Features.Auth.ObtenerPerfil;
using ConectaRiesgoAI.Api.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ConectaRiesgoAI.Api.Tests.Features.Auth;

public class ObtenerPerfilHandlerTests
{
    private sealed class UsuarioActualFalso(int? id) : IUsuarioActual
    {
        public int? Id => id;
        public string? Nombre => "Test";
        public Domain.Enums.Rol? Rol => Domain.Enums.Rol.Ciudadano;
        public bool EstaAutenticado => id.HasValue;
    }

    private static AppDbContext NuevoContexto() => new(
        new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    [Fact]
    public async Task Handle_UsuarioExiste_DevuelveDtoActualizado()
    {
        using AppDbContext db = NuevoContexto();
        Usuario entidad = new()
        {
            Nombre = "María Rodríguez",
            Email = "maria@ejemplo.com",
            PasswordHash = "hash",
            Rol = Rol.Ciudadano,
            Municipio = "Bogotá"
        };
        db.Usuarios.Add(entidad);
        await db.SaveChangesAsync();

        ObtenerPerfilHandler handler = new(db, new UsuarioActualFalso(entidad.Id));
        UsuarioDto perfil = await handler.Handle(new ObtenerPerfilQuery(), CancellationToken.None);

        Assert.Equal(entidad.Id, perfil.Id);
        Assert.Equal("María Rodríguez", perfil.Nombre);
        Assert.Equal("maria@ejemplo.com", perfil.Email);
    }

    [Fact]
    public async Task Handle_UsuarioDelTokenYaNoExiste_LanzaKeyNotFoundException()
    {
        using AppDbContext db = NuevoContexto();
        ObtenerPerfilHandler handler = new(db, new UsuarioActualFalso(999));

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => handler.Handle(new ObtenerPerfilQuery(), CancellationToken.None));
    }
}
