import { test, expect, type Page } from '@playwright/test';

/**
 * Comprueba que lo que hay en la base de datos llega hasta la pantalla.
 *
 * Las pruebas unitarias verifican piezas con datos que ellas mismas inventan.
 * Ninguna se entera de que la API cambió una llave, de que el adaptador tradujo
 * mal un estado, de que CORS bloquea al navegador o de que la pantalla se quedó
 * cargando para siempre. Eso solo se ve levantando la aplicación de verdad
 * contra el backend de verdad, que es lo que hace este archivo.
 *
 * Se usan localizadores y no `innerText`: el texto se lee una sola vez y falla
 * si React todavía no terminó de pintar, mientras que un localizador reintenta
 * hasta que aparece. La primera versión de estas pruebas caía por eso, no por
 * la aplicación.
 *
 * Requiere el backend levantado y la base sembrada:
 *   node back/scripts/sembrar-demo.mjs
 */

/*
 * El mismo puerto que usa el backend al arrancar (`launchSettings.json`) y que
 * dan por supuesto el contrato de API y el cliente del frontend. Si se levanta en
 * otro —por ejemplo para no chocar con una instancia ya abierta— se pasa por
 * `API_URL`, igual que al sembrador con `API`.
 */
const API = process.env.API_URL ?? 'http://localhost:5000';

interface ReporteApi {
  codigo: string;
  tipo: string;
  estado: string;
  canal: string;
  municipio: string;
  descripcion: string;
}

/** Lo que el backend tiene ahora mismo, para comparar contra lo que se ve. */
async function reportesDeLaApi(page: Page): Promise<ReporteApi[]> {
  const respuesta = await page.request.get(`${API}/api/reportes`);
  expect(respuesta.ok(), `el backend debe responder ${API}/api/reportes`).toBeTruthy();
  return (await respuesta.json()) as ReporteApi[];
}

test.describe('los datos del backend llegan a la pantalla', () => {
  // https://github.com/jasonfabian8/app-ungrd/issues/93
  // El tablero del gestor pinta con listReportes(), que devuelve datos mock fijos
  // en vez de llamar al backend: estas tres pruebas comparan contra la API real y
  // fallan siempre, no por flakiness. Se reactivan cuando /gestor consuma /api/reportes.
  test.fixme('el tablero del gestor pinta los reportes que existen en la base', async ({ page }) => {
    const esperados = await reportesDeLaApi(page);
    expect(esperados.length, 'la base tiene que estar sembrada').toBeGreaterThan(0);

    await page.goto('/gestor');

    // Si el contador sigue en cero, la lista quedó vacía pese a que la API respondió.
    await expect(page.getByText(String(esperados.length), { exact: true }).first()).toBeVisible();
  });

  // https://github.com/jasonfabian8/app-ungrd/issues/93
  test.fixme('cada reporte cae en la columna de su estado', async ({ page }) => {
    const esperados = await reportesDeLaApi(page);
    const avanzados = esperados.filter((r) => r.estado !== 'Reportado');
    test.skip(avanzados.length === 0, 'la base no tiene casos avanzados que comprobar');

    await page.goto('/gestor');

    /*
     * Se comprueba el contador de cada columna y no las tarjetas: en móvil las
     * columnas van plegadas —solo la primera abre sola— así que las tarjetas de
     * las demás no están visibles, aunque el reporte sí llegó. El contador de la
     * cabecera se ve siempre, en móvil y en escritorio.
     *
     * Si el adaptador tradujera mal un estado, el reporte se contaría en otra
     * columna y este número no cuadraría.
     */
    const columnas: { etiqueta: RegExp; estado: string }[] = [
      { etiqueta: /^Reportados\b/, estado: 'Reportado' },
      { etiqueta: /^Verificados\b/, estado: 'Verificado' },
      { etiqueta: /^Asignados\b/, estado: 'Asignado' },
      { etiqueta: /^En atención\b/, estado: 'EnAtencion' },
      { etiqueta: /^Atendidos\b/, estado: 'Atendido' },
      { etiqueta: /^Cerrados\b/, estado: 'Cerrado' },
    ];

    for (const { etiqueta, estado } of columnas) {
      const cuantos = esperados.filter((r) => r.estado === estado).length;
      const cabecera = page.getByRole('button', { name: etiqueta });
      await expect(cabecera, `columna ${estado}`).toContainText(String(cuantos));
    }
  });

  test('el detalle de un reporte muestra su cronología completa', async ({ page }) => {
    const esperados = await reportesDeLaApi(page);
    const avanzado = esperados.find((r) => r.estado === 'Cerrado' || r.estado === 'Atendido');
    test.skip(!avanzado, 'no hay ningún reporte avanzado en la base');

    await page.goto(`/reporte/${avanzado!.codigo}`);

    // El código es lo único que la persona se lleva de la emergencia.
    await expect(page.getByText(avanzado!.codigo).first()).toBeVisible();

    // La cronología es la promesa del producto: un caso avanzado pasó por varios
    // estados y todos tienen que verse, no solo el último.
    await expect(page.getByText('Historial del reporte')).toBeVisible();
    await expect(page.getByText('Reporte recibido').first()).toBeVisible();
    await expect(page.getByText('Verificado por la entidad').first()).toBeVisible();
  });

  test('un reporte hecho por llamada dice que entró por llamada', async ({ page }) => {
    const esperados = await reportesDeLaApi(page);
    const porLlamada = esperados.find((r) => r.canal === 'Telefono');
    test.skip(!porLlamada, 'no hay reportes por teléfono en la base');

    await page.goto(`/reporte/${porLlamada!.codigo}`);

    await expect(page.getByText(porLlamada!.codigo).first()).toBeVisible();
    // Decirle «recibido por WhatsApp» a quien llamó le hace dudar de si quedó.
    await expect(page.getByText(/llamada telefónica/i).first()).toBeVisible();
  });

  test('un código que no existe lo dice, en vez de quedarse cargando', async ({ page }) => {
    await page.goto('/reporte/RPT-0000-00-00-9999-ZZZZ');

    await expect(page.getByText(/no encontramos|no existe|no aparece/i).first()).toBeVisible();
  });
});

test.describe('la pantalla se comporta cuando el servidor no responde', () => {
  // https://github.com/jasonfabian8/app-ungrd/issues/93
  // /gestor no llama a /api/reportes todavía, así que abortar esa ruta no tiene
  // ningún efecto sobre esta pantalla.
  test.fixme('el tablero avisa y ofrece reintentar en vez de quedarse vacío', async ({ page }) => {
    /*
     * Se corta la API a propósito: es el escenario de alguien con mala señal.
     * El patrón apunta al host del backend y no a `**` /api/reportes` **`, que en
     * desarrollo también bloqueaba `src/api/reportes.ts` —el archivo fuente— y
     * tumbaba el módulo entero en vez de solo la petición.
     */
    await page.route(`${API}/api/reportes*`, (ruta) => ruta.abort('failed'));

    await page.goto('/gestor');

    await expect(page.getByText('No pudimos cargar la información')).toBeVisible();
    await expect(page.getByRole('button', { name: /intentar de nuevo/i })).toBeVisible();
  });

  test('el detalle tampoco se queda cargando para siempre', async ({ page }) => {
    await page.route(`${API}/api/reportes/*`, (ruta) => ruta.abort('failed'));

    await page.goto('/reporte/RPT-2026-08-16-0017');

    // Cualquiera de las dos salidas sirve; lo que no vale es el limbo.
    const salida = page
      .getByText('No pudimos cargar la información')
      .or(page.getByText(/no encontramos|no existe/i))
      .first();
    await expect(salida).toBeVisible();
  });
});
