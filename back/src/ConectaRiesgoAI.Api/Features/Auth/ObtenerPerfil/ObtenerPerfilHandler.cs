using ConectaRiesgoAI.Api.Common.Auth;
using ConectaRiesgoAI.Api.Domain.Entities;
using ConectaRiesgoAI.Api.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ConectaRiesgoAI.Api.Features.Auth.ObtenerPerfil;

/// <summary>Relee al usuario en base de datos en vez de confiar solo en los claims del token: así refleja cambios recientes, no lo que había al momento del login.</summary>
public class ObtenerPerfilHandler(AppDbContext db, IUsuarioActual usuarioActual)
    : IRequestHandler<ObtenerPerfilQuery, UsuarioDto>
{
    public async Task<UsuarioDto> Handle(ObtenerPerfilQuery request, CancellationToken cancellationToken)
    {
        Usuario usuario = await db.Usuarios.SingleOrDefaultAsync(u => u.Id == usuarioActual.Id, cancellationToken)
            ?? throw new KeyNotFoundException("El usuario del token ya no existe");

        return UsuarioDto.DeEntidad(usuario);
    }
}
