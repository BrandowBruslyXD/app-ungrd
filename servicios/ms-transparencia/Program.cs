using RespondeYA.Integraciones.Configuracion;
using RespondeYA.Integraciones.Modelos;
using RespondeYA.Integraciones.Secop;

// ─────────────────────────────────────────────────────────────────────────────
//  MICROSERVICIO DE TRANSPARENCIA
//  Consulta SECOP II en datos.gov.co y devuelve los contratos de prevención
//  del riesgo de un municipio.
//
//  Este es el diferenciador más fuerte del pitch: conecta el reporte de una
//  emergencia con el dinero público que se destinó a prevenirla.
// ─────────────────────────────────────────────────────────────────────────────

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<OpcionesIntegraciones>(
    builder.Configuration.GetSection(OpcionesIntegraciones.Seccion));

builder.Services.AddMemoryCache();

builder.Services.AddHttpClient<IServicioSecop, ServicioSecop>(cliente =>
{
    cliente.BaseAddress = new Uri("https://www.datos.gov.co/");
    cliente.Timeout = TimeSpan.FromSeconds(8); // Socrata a veces es lento
});

builder.Services.AddCors(opciones =>
    opciones.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();
app.UseCors();

// ── Salud ────────────────────────────────────────────────────────────────────
app.MapGet("/health", () => Results.Ok(new
{
    servicio = "ms-transparencia",
    estado = "arriba",
    fuente = "SECOP II · datos.gov.co",
    // Este servicio funciona sin token: solo cambia el límite de peticiones.
    configurado = true
}));

// ── Contratos de prevención ──────────────────────────────────────────────────
// GET /contratos?municipio=Bogotá
//
// Siempre responde 200. Si no hay contratos o SECOP falla, devuelve una lista
// vacía: el frontend oculta el bloque y no muestra ningún error al ciudadano.
app.MapGet("/contratos", async (
    string municipio,
    IServicioSecop secop,
    CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(municipio))
        return Results.BadRequest(new { error = "El municipio es obligatorio", detalles = (object?)null });

    var resultado = await secop.ObtenerContratosPrevencionAsync(municipio, ct);
    var esRespaldo = resultado.Origen == OrigenDatos.Respaldo;

    return Results.Ok(new
    {
        municipio,
        total = resultado.Contratos.Count,
        valorTotal = resultado.Contratos.Sum(c => c.Valor),

        // El origen viaja explícito para que la interfaz pueda advertirlo.
        // Mostrar datos de respaldo como si fueran reales sería engañar al jurado.
        origen = resultado.Origen.ToString(),
        datosReales = !esRespaldo,
        advertencia = esRespaldo
            ? "SECOP no respondió. Estos son datos de respaldo, NO son contratos reales. " +
              "La interfaz debe advertirlo y hay que decirlo en el pitch."
            : null,

        contratos = resultado.Contratos
    });
});

app.Run();
