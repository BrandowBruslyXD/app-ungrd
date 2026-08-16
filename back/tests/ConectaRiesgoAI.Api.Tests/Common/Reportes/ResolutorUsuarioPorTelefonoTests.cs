using ConectaRiesgoAI.Api.Common.Reportes;
using ConectaRiesgoAI.Api.Domain.Entities;
using ConectaRiesgoAI.Api.Domain.Enums;
using ConectaRiesgoAI.Api.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace ConectaRiesgoAI.Api.Tests.Common.Reportes;

public class ResolutorUsuarioPorTelefonoTests
{
    private static ResolutorUsuarioPorTelefono NuevoResolutor(AppDbContext db) =>
        new(db, NullLogger<ResolutorUsuarioPorTelefono>.Instance);

    [Fact]
    public async Task ResolverOCrear_UsuarioYaExiste_DevuelveElExistenteSinCrearOtro()
    {
        using AppDbContext db = NuevoContexto();
        db.Usuarios.Add(new Usuario
        {
            Nombre = "Pedro",
            Email = "pedro@ejemplo.com",
            PasswordHash = "hash",
            Municipio = "Medellín",
            Telefono = "573009876543"
        });
        await db.SaveChangesAsync();

        Usuario resuelto = await NuevoResolutor(db).ResolverOCrearAsync(
            "573009876543", CanalOrigen.Telefono, "Otro nombre", "Cali", CancellationToken.None);

        Assert.Equal("Pedro", resuelto.Nombre);
        Assert.Equal(1, await db.Usuarios.CountAsync());
    }

    [Fact]
    public async Task ResolverOCrear_CanalWeb_UsaPrefijoIngestaGenericoEnEmail()
    {
        using AppDbContext db = NuevoContexto();

        Usuario resuelto = await NuevoResolutor(db).ResolverOCrearAsync(
            "573007776665", CanalOrigen.Web, "Luis P.", "Bogotá", CancellationToken.None);

        Assert.StartsWith("ingesta-573007776665@", resuelto.Email);
    }

    private static AppDbContext NuevoContexto() => new(
        new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);
}
