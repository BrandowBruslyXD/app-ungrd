using Microsoft.Extensions.Options;
using RespondeYA.Integraciones.Configuracion;
using RespondeYA.Integraciones.Social;

// ─────────────────────────────────────────────────────────────────────────────
//  MICROSERVICIO SOCIAL
//  Escucha redes sociales buscando señales de emergencia, las clasifica por
//  tipo y las geolocaliza por municipio.
//
//  La fuente es intercambiable (Bluesky gratis / X de pago) porque X dejó de
//  permitir búsquedas en su plan gratuito. Se cambia con una línea de
//  configuración, sin tocar código.
// ─────────────────────────────────────────────────────────────────────────────

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<OpcionesIntegraciones>(
    builder.Configuration.GetSection(OpcionesIntegraciones.Seccion));

builder.Services.AddMemoryCache();

builder.Services.AddHttpClient<FuenteBluesky>(cliente =>
{
    cliente.BaseAddress = new Uri("https://bsky.social/");
    cliente.Timeout = TimeSpan.FromSeconds(10);
});

builder.Services.AddHttpClient<FuenteX>(cliente =>
{
    cliente.BaseAddress = new Uri("https://api.twitter.com/");
    cliente.Timeout = TimeSpan.FromSeconds(10);
});

// La fuente activa se elige en configuración: "Bluesky", "X" o "Ninguna".
builder.Services.AddScoped<IFuenteSocial>(sp =>
{
    var opciones = sp.GetRequiredService<IOptions<OpcionesIntegraciones>>().Value.Social;

    return opciones.Proveedor.ToUpperInvariant() switch
    {
        "X" => sp.GetRequiredService<FuenteX>(),
        "BLUESKY" => sp.GetRequiredService<FuenteBluesky>(),
        _ => new FuenteSocialNula()
    };
});

builder.Services.AddCors(opciones =>
    opciones.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();
app.UseCors();

// ── Salud ────────────────────────────────────────────────────────────────────
app.MapGet("/health", (IFuenteSocial fuente) => Results.Ok(new
{
    servicio = "ms-social",
    estado = "arriba",
    fuente = fuente.Nombre,
    configurado = fuente.Disponible,
    mensaje = fuente.Disponible
        ? $"Escuchando {fuente.Nombre}"
        : "Sin credenciales de red social. El servicio responde, pero no ingiere señales."
}));

// ── Señales de emergencia ────────────────────────────────────────────────────
// GET /senales?tipo=Incendio&municipio=Bogotá&minRelevancia=40
//
// Devuelve lo que se detectó en redes, ya clasificado. El backend decide si
// convierte una señal en un reporte automático: este servicio solo informa.
app.MapGet("/senales", async (
    IFuenteSocial fuente,
    CancellationToken ct,
    string? tipo = null,
    string? municipio = null,
    int minRelevancia = 40) =>
{
    var senales = await fuente.BuscarAsync(ClasificadorEmergencias.TerminosDeBusqueda(), ct);

    var filtradas = senales.Where(s => s.Relevancia >= minRelevancia);

    if (!string.IsNullOrWhiteSpace(tipo))
        filtradas = filtradas.Where(s => s.TipoSugerido.Equals(tipo, StringComparison.OrdinalIgnoreCase));

    if (!string.IsNullOrWhiteSpace(municipio))
        filtradas = filtradas.Where(s =>
            s.MunicipioDetectado is not null &&
            s.MunicipioDetectado.Contains(municipio, StringComparison.OrdinalIgnoreCase));

    var resultado = filtradas.ToList();

    return Results.Ok(new
    {
        fuente = fuente.Nombre,
        disponible = fuente.Disponible,
        total = resultado.Count,
        senales = resultado
    });
});

// ── Clasificador suelto ──────────────────────────────────────────────────────
// POST /clasificar  { "texto": "se inundó la vía en Bogotá" }
//
// Permite probar el clasificador sin depender de la red social. Muy útil para
// demostrar la lógica en el pitch aunque las credenciales fallen.
app.MapPost("/clasificar", (SolicitudClasificar solicitud) =>
{
    if (string.IsNullOrWhiteSpace(solicitud.Texto))
        return Results.BadRequest(new { error = "El texto es obligatorio", detalles = (object?)null });

    var (tipo, municipio, relevancia) = ClasificadorEmergencias.Clasificar(solicitud.Texto);

    return Results.Ok(new { tipo, municipio, relevancia });
});

app.Run();

record SolicitudClasificar(string Texto);
