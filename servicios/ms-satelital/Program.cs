using Microsoft.Extensions.Options;
using RespondeYA.Integraciones.Configuracion;
using RespondeYA.Integraciones.Nasa;

// ─────────────────────────────────────────────────────────────────────────────
//  MICROSERVICIO SATELITAL
//  Verifica reportes contra los focos de calor que detecta NASA FIRMS.
//  Es independiente del backend principal: se despliega, se cae y se reinicia
//  solo, sin arrastrar a nadie.
// ─────────────────────────────────────────────────────────────────────────────

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<OpcionesIntegraciones>(
    builder.Configuration.GetSection(OpcionesIntegraciones.Seccion));

builder.Services.AddMemoryCache();

builder.Services.AddHttpClient<IServicioFirms, ServicioFirms>(cliente =>
{
    cliente.BaseAddress = new Uri("https://firms.modaps.eosdis.nasa.gov/");
    // Si NASA tarda más de 5 segundos, se responde sin verificación.
    // Una demo no se puede congelar esperando a un servicio ajeno.
    cliente.Timeout = TimeSpan.FromSeconds(5);
});

builder.Services.AddCors(opciones =>
    opciones.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();
app.UseCors();

// ── Salud ────────────────────────────────────────────────────────────────────
app.MapGet("/health", (IOptions<OpcionesIntegraciones> opciones) => Results.Ok(new
{
    servicio = "ms-satelital",
    estado = "arriba",
    fuente = "NASA FIRMS",
    configurado = opciones.Value.Nasa.Habilitado,
    mensaje = opciones.Value.Nasa.Habilitado
        ? "Listo para verificar reportes"
        : "Falta la MapKey de NASA FIRMS. El servicio responde, pero sin verificación."
}));

// ── Verificación ─────────────────────────────────────────────────────────────
// GET /verificar?lat=4.71&lng=-74.07
//
// Devuelve 200 con el objeto de verificación, o 204 (Sin contenido) cuando no
// hay dato. El backend traduce el 204 a "verificacionSatelital": null, tal como
// lo espera el contrato de API.
app.MapGet("/verificar", async (
    double lat,
    double lng,
    IServicioFirms firms,
    CancellationToken ct) =>
{
    if (lat is < -90 or > 90 || lng is < -180 or > 180)
        return Results.BadRequest(new { error = "Coordenadas fuera de rango", detalles = (object?)null });

    var verificacion = await firms.VerificarAsync(lat, lng, ct);

    return verificacion is null
        ? Results.NoContent()
        : Results.Ok(verificacion);
});

app.Run();
