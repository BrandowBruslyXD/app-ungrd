using System.Text;
using ConectaRiesgoAI.Api.Common.Errors;
using ConectaRiesgoAI.Api.Domain.Enums;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

namespace ConectaRiesgoAI.Api.Common.Auth;

public static class AuthExtensions
{
    /// <summary>Nombres de las políticas. Los slices las piden con <c>.RequireAuthorization(Politicas.Gestor)</c>.</summary>
    public static class Politicas
    {
        /// <summary>Gestor o Admin: quien puede mover el estado de un reporte.</summary>
        public const string Gestor = nameof(Gestor);

        /// <summary>Solo Admin.</summary>
        public const string Admin = nameof(Admin);
    }

    public static IServiceCollection AgregarAutenticacion(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var opciones = configuration.GetSection(OpcionesJwt.Seccion).Get<OpcionesJwt>()
            ?? throw new InvalidOperationException(
                "Falta la sección 'Jwt' en la configuración. Revisa appsettings.Development.json.");

        services.Configure<OpcionesJwt>(configuration.GetSection(OpcionesJwt.Seccion));
        services.AddHttpContextAccessor();
        services.AddScoped<IUsuarioActual, UsuarioActual>();
        services.AddScoped<IGeneradorTokenJwt, GeneradorTokenJwt>();

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(o =>
            {
                o.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = opciones.Issuer,
                    ValidAudience = opciones.Audience,
                    IssuerSigningKey = new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(opciones.Secret)),
                    ClockSkew = TimeSpan.FromMinutes(1)
                };

                // Sin esto, un 401 o un 403 saldrían con cuerpo vacío y romperían
                // la promesa del contrato de que todo error tiene la misma forma.
                o.Events = new JwtBearerEvents
                {
                    OnChallenge = async contexto =>
                    {
                        contexto.HandleResponse();
                        contexto.Response.StatusCode = StatusCodes.Status401Unauthorized;
                        await contexto.Response.WriteAsJsonAsync(
                            new RespuestaError("Falta el token o está vencido"));
                    },
                    OnForbidden = async contexto =>
                    {
                        contexto.Response.StatusCode = StatusCodes.Status403Forbidden;
                        await contexto.Response.WriteAsJsonAsync(
                            new RespuestaError("No tiene el rol necesario para esta acción"));
                    }
                };
            });

        services.AddAuthorization(o =>
        {
            o.AddPolicy(Politicas.Gestor, p =>
                p.RequireRole(nameof(Rol.Gestor), nameof(Rol.Admin)));
            o.AddPolicy(Politicas.Admin, p =>
                p.RequireRole(nameof(Rol.Admin)));
        });

        return services;
    }
}
