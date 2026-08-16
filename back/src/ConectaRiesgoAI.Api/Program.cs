using System.Text.Json.Serialization;
using ConectaRiesgoAI.Api.Common.Auth;
using ConectaRiesgoAI.Api.Common.Behaviors;
using ConectaRiesgoAI.Api.Common.Endpoints;
using ConectaRiesgoAI.Api.Common.Errors;
using ConectaRiesgoAI.Api.Common.Reportes;
using ConectaRiesgoAI.Api.Persistence;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);

const string PoliticaCors = "FrontLocal";

// --- Serialización -------------------------------------------------------
// El contrato exige enums como texto ("Incendio", no 0) y camelCase.
// camelCase ya es el valor por omisión; los enums no, y sin esto se rompe el frontend.
builder.Services.ConfigureHttpJsonOptions(o =>
{
    o.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
    o.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.Never;
});

// --- Base de datos -------------------------------------------------------
builder.Services.AddDbContext<AppDbContext>(o =>
    o.UseNpgsql(builder.Configuration.GetConnectionString("Postgres")));

// --- MediatR y validación ------------------------------------------------
builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssembly(typeof(Program).Assembly);
    cfg.AddOpenBehavior(typeof(ValidationBehavior<,>));
});
builder.Services.AddValidatorsFromAssembly(typeof(Program).Assembly);

// --- Identidad de canal en reportes --------------------------------------
builder.Services.AddScoped<IResolutorUsuarioPorTelefono, ResolutorUsuarioPorTelefono>();
builder.Services.AddScoped<IBuscadorReporteIdempotente, BuscadorReporteIdempotente>();

// --- Autenticación -------------------------------------------------------
builder.Services.AgregarAutenticacion(builder.Configuration);

// --- Errores -------------------------------------------------------------
builder.Services.AddExceptionHandler<ManejadorGlobalDeErrores>();
builder.Services.AddProblemDetails();

// --- CORS ----------------------------------------------------------------
var origenesPermitidos = builder.Configuration
    .GetSection("Cors:Origenes").Get<string[]>() ?? ["http://localhost:5173"];

builder.Services.AddCors(o => o.AddPolicy(PoliticaCors, p => p
    .WithOrigins(origenesPermitidos)
    .AllowAnyHeader()
    .AllowAnyMethod()));

// --- Swagger -------------------------------------------------------------
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(o =>
{
    o.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "ConectaRiesgoAI",
        Version = "v1",
        Description = "API de reporte y seguimiento de emergencias. Contrato en docs/CONTRATO-API.md"
    });

    o.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Pega aquí el token que devuelve /api/auth/login (sin escribir 'Bearer')."
    });

    o.AddSecurityRequirement(documento => new OpenApiSecurityRequirement
    {
        { new OpenApiSecuritySchemeReference("Bearer", documento), new List<string>() }
    });
});

var app = builder.Build();

app.UseExceptionHandler();
app.UseCors(PoliticaCors);
app.UseAuthentication();
app.UseAuthorization();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(o =>
    {
        o.SwaggerEndpoint("/swagger/v1/swagger.json", "ConectaRiesgoAI v1");
        o.RoutePrefix = "swagger";
    });
}

// Comprobación de vida. Sirve para saber si la API está arriba sin depender de la base de datos.
// Va en las dos rutas a propósito: /health es la que pide el issue de infraestructura y la que
// esperan las sondas de despliegue; /api/health mantiene la regla del contrato de que todo cuelga de /api.
var health = () => Results.Ok(new
{
    estado = "ok",
    servicio = "ConectaRiesgoAI",
    fecha = DateTime.UtcNow
});

app.MapGet("/health", health).WithName("Health").WithTags("Sistema");
app.MapGet("/api/health", health).WithName("HealthApi").WithTags("Sistema");

// Cada slice que implemente IEndpoint queda registrado aquí sin tocar este archivo.
app.MapEndpointsDeSlices();

app.Run();
