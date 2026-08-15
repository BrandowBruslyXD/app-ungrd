/**
 * API mínima de ConectaRiesgoAI para la demo del bot de WhatsApp.
 *
 * Existe para que el flujo devuelva códigos de seguimiento REALES mientras el
 * backend .NET en Azure no está desplegado. Cuando lo esté, se cambia la URL en
 * los nodos httpRequest y este servicio se apaga: el contrato es el mismo.
 *
 * Sin dependencias: http nativo. Persiste en disco para sobrevivir reinicios.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PUERTO = process.env.PORT || 3001;
const DIR_DATOS = process.env.DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(DIR_DATOS, { recursive: true });
const ARCHIVO = path.join(DIR_DATOS, 'datos.json');

// ── Persistencia simple ───────────────────────────────────────────────────────
let datos = { reportes: {}, censos: {}, consecutivo: 0 };
try {
  if (fs.existsSync(ARCHIVO)) datos = JSON.parse(fs.readFileSync(ARCHIVO, 'utf8'));
} catch (e) {
  console.error('[api] no se pudo leer datos.json, arranco vacío:', e.message);
}
const guardar = () => {
  try {
    fs.writeFileSync(ARCHIVO, JSON.stringify(datos, null, 2));
  } catch (e) {
    console.error('[api] no se pudo guardar:', e.message);
  }
};

// ── Utilidades ────────────────────────────────────────────────────────────────
const hoy = () => new Date().toISOString().slice(0, 10);

/** Código que ve el ciudadano: RPT-2026-08-16-0001 */
const nuevoCodigo = (prefijo) => {
  datos.consecutivo += 1;
  return `${prefijo}-${hoy()}-${String(datos.consecutivo).padStart(4, '0')}`;
};

const json = (res, codigo, cuerpo) => {
  const texto = JSON.stringify(cuerpo);
  res.writeHead(codigo, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(texto),
  });
  res.end(texto);
};

const leerCuerpo = (req) =>
  new Promise((resolve) => {
    let bruto = '';
    req.on('data', (c) => {
      bruto += c;
      if (bruto.length > 1e6) req.destroy(); // tope defensivo
    });
    req.on('end', () => {
      try {
        resolve(bruto ? JSON.parse(bruto) : {});
      } catch {
        resolve({});
      }
    });
  });

/** Etiquetas legibles: el flujo manda el número que eligió el ciudadano. */
const NIVEL_DANO = {
  1: 'Averiada — habitable',
  2: 'Averiada — NO habitable',
  3: 'Destruida',
  4: 'Otros bienes (cultivos, animales, negocio)',
};
const NECESIDAD = {
  1: 'AHE alimentaria',
  2: 'AHE no alimentaria',
  3: 'Materiales de rehabilitación',
  4: 'Subsidio de arriendo',
};
const etiqueta = (mapa, valor) => mapa[String(valor).trim()] || valor || 'No especificado';

/** Cronología inicial. El primer evento nace con el reporte. */
const cronologiaInicial = () => [
  { estado: 'Recibido', nota: 'Reporte recibido por WhatsApp', fecha: new Date().toISOString() },
];

const humano = (iso) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} del ${d.getDate()}/${d.getMonth() + 1}`;
};

// ── Servidor ──────────────────────────────────────────────────────────────────
const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PUERTO}`);
  const ruta = url.pathname.replace(/\/+$/, '') || '/';

  // Salud
  if (ruta === '/health' || ruta === '/') {
    return json(res, 200, {
      servicio: 'conectariesgo-api',
      estado: 'arriba',
      reportes: Object.keys(datos.reportes).length,
      censos: Object.keys(datos.censos).length,
    });
  }

  // ── Crear reporte (ciudadano) ───────────────────────────────────────────────
  if (ruta === '/reportes' && req.method === 'POST') {
    const b = await leerCuerpo(req);
    const codigo = nuevoCodigo('RPT');

    datos.reportes[codigo] = {
      codigo,
      clase: b.clase || 'aviso_evento',
      confianza: b.confianza || 'autorreportado',
      relato: b.relato || '',
      ubicacion: b.ubicacion || '',
      nivelDano: b.nivelDano ? etiqueta(NIVEL_DANO, b.nivelDano) : null,
      necesidad: b.necesidad ? etiqueta(NECESIDAD, b.necesidad) : null,
      telefono: b.telefono || '',
      foto: b.foto && String(b.foto).toLowerCase() !== 'no' ? b.foto : null,
      estado: 'Recibido',
      cronologia: cronologiaInicial(),
      creadoEn: new Date().toISOString(),
    };
    guardar();

    console.log(`[api] reporte ${codigo} · ${b.clase} · ${b.ubicacion}`);
    return json(res, 201, { codigo, estado: 'Recibido' });
  }

  // ── Consultar reporte ───────────────────────────────────────────────────────
  if (ruta.startsWith('/reportes/') && req.method === 'GET') {
    const codigo = decodeURIComponent(ruta.slice('/reportes/'.length)).trim().toUpperCase();
    const r = datos.reportes[codigo];

    // El nodo httpRequest de wabots solo va a 'onError' si falla la red: un 404
    // saldría por la rama normal con campos vacíos. Por eso se responde 200 con el
    // mensaje ya redactado, y el ciudadano lee algo con sentido.
    if (!r) {
      return json(res, 200, {
        codigo,
        estado: 'No encontrado',
        actualizado: '—',
        detalle:
          'No encontre un reporte con ese codigo.\n\n' +
          'Revisa que este completo. Si crees que hay un error, escribe *hola* y elige la opcion 5.',
      });
    }

    const lineas = r.cronologia
      .map((e) => `• ${e.estado} — ${humano(e.fecha)}${e.nota ? `\n  ${e.nota}` : ''}`)
      .join('\n');

    const detalle = [
      r.ubicacion ? `📍 ${r.ubicacion}` : null,
      r.nivelDano ? `🏠 ${r.nivelDano}` : null,
      r.necesidad ? `🆘 ${r.necesidad}` : null,
      '',
      '*Cronología:*',
      lineas,
    ]
      .filter((x) => x !== null)
      .join('\n');

    return json(res, 200, {
      codigo: r.codigo,
      estado: r.estado,
      actualizado: humano(r.cronologia[r.cronologia.length - 1].fecha),
      detalle,
    });
  }

  // ── Avanzar el estado (para la demo en vivo) ────────────────────────────────
  if (ruta.startsWith('/reportes/') && ruta.endsWith('/estado') && req.method === 'POST') {
    const codigo = decodeURIComponent(ruta.split('/')[2]).trim().toUpperCase();
    const r = datos.reportes[codigo];
    if (!r) return json(res, 404, { error: 'No existe un reporte con ese código' });

    const b = await leerCuerpo(req);
    const estado = b.estado || 'Verificado';
    r.estado = estado;
    r.cronologia.push({ estado, nota: b.nota || '', fecha: new Date().toISOString() });
    guardar();

    console.log(`[api] ${codigo} → ${estado}`);
    return json(res, 200, { codigo, estado });
  }

  // ── Registro censal (brigadista) ────────────────────────────────────────────
  if (ruta === '/censo' && req.method === 'POST') {
    const b = await leerCuerpo(req);

    // Sin consentimiento no se persiste (Ley 1581 de 2012).
    if (!b.consentimiento) {
      return json(res, 400, { error: 'Falta el consentimiento de tratamiento de datos' });
    }

    const codigo = nuevoCodigo('CEN');
    datos.censos[codigo] = {
      codigo,
      confianza: 'censado',
      operacion: b.operacion || '',
      direccion: b.direccion || '',
      estadoVivienda: b.estadoVivienda ? etiqueta(NIVEL_DANO, b.estadoVivienda) : '',
      jefeHogar: b.jefeHogar || '',
      numPersonas: Number(b.numPersonas) || 0,
      necesidad: b.necesidad ? etiqueta(NECESIDAD, b.necesidad) : '',
      brigadista: b.brigadista || '',
      creadoEn: new Date().toISOString(),
    };
    guardar();

    console.log(`[api] censo ${codigo} · ${b.operacion} · ${b.numPersonas} personas`);
    return json(res, 201, { codigo, estado: 'Registrado' });
  }

  // ── Listado, para ver lo capturado durante la demo ──────────────────────────
  if (ruta === '/todo' && req.method === 'GET') {
    return json(res, 200, {
      reportes: Object.values(datos.reportes),
      censos: Object.values(datos.censos),
    });
  }

  return json(res, 404, {
    error: 'Ruta no encontrada',
    rutas: [
      'GET  /health',
      'POST /reportes',
      'GET  /reportes/:codigo',
      'POST /reportes/:codigo/estado',
      'POST /censo',
      'GET  /todo',
    ],
  });
});

servidor.listen(PUERTO, () => {
  console.log(`[conectariesgo-api] escuchando en :${PUERTO}`);
});
