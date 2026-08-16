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
const crypto = require('crypto');

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

/**
 * Código que ve el ciudadano: RPT-2026-08-16-0001-K7M2
 *
 * El consecutivo sirve para ordenar y contar; el sufijo aleatorio evita que el
 * código sea adivinable. Sin él, cualquiera podía recorrer 0001, 0002, 0003… y
 * leer teléfono, ubicación y nivel de daño de reportes ajenos, porque la consulta
 * es pública por diseño (el código funciona como número de guía: quien lo tiene,
 * accede). Con 4 caracteres de un alfabeto sin ambigüedades hay ~1,3 millones de
 * combinaciones por consecutivo: suficiente para que enumerar no sea práctico.
 */
const ALFABETO = 'ACDEFGHJKLMNPQRTUVWXY34679'; // sin I, O, S, B, 0, 1, 2, 5, 8

const sufijo = (n = 4) => {
  const bytes = crypto.randomBytes(n);
  return Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join('');
};

const nuevoCodigo = (prefijo) => {
  datos.consecutivo += 1;
  return `${prefijo}-${hoy()}-${String(datos.consecutivo).padStart(4, '0')}-${sufijo()}`;
};

const json = (res, codigo, cuerpo) => {
  const texto = JSON.stringify(cuerpo);
  res.writeHead(codigo, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(texto),
  });
  res.end(texto);
};

const LIMITE_CUERPO = 1e6; // 1 MB

/**
 * Lee el cuerpo de la petición.
 *
 * Devuelve { ok, datos } en vez de lanzar: si el cuerpo excede el límite hay que
 * responder 413 y cerrar, no dejar la promesa colgada. `req.destroy()` no dispara
 * 'end', así que resolver ahí dentro era esperar un evento que nunca llega: el
 * handler no respondía nunca y el par req/res quedaba retenido en memoria. En un
 * contenedor de 128 MB, unas pocas peticiones así lo tumban.
 */
const leerCuerpo = (req) =>
  new Promise((resolve) => {
    let bruto = '';
    let cerrado = false;
    const terminar = (r) => {
      if (!cerrado) {
        cerrado = true;
        resolve(r);
      }
    };

    req.on('data', (c) => {
      bruto += c;
      if (bruto.length > LIMITE_CUERPO) {
        // Pausar en vez de destruir: destruir cierra la conexión antes de que el
        // 413 llegue al cliente, que solo ve "conexión cerrada". Se pausa, se
        // responde, y quien responde cierra.
        req.pause();
        terminar({ ok: false, motivo: 'demasiado_grande', datos: {} });
      }
    });
    req.on('end', () => {
      try {
        terminar({ ok: true, datos: bruto ? JSON.parse(bruto) : {} });
      } catch {
        terminar({ ok: false, motivo: 'json_invalido', datos: {} });
      }
    });
    req.on('error', () => terminar({ ok: false, motivo: 'error_lectura', datos: {} }));
    req.on('aborted', () => terminar({ ok: false, motivo: 'abortada', datos: {} }));
  });

/** Lee el cuerpo y responde el error apropiado. Devuelve null si ya se respondió. */
const cuerpoOResponder = async (req, res) => {
  const r = await leerCuerpo(req);
  if (r.ok) return r.datos;
  if (r.motivo === 'demasiado_grande') {
    json(res, 413, { error: 'El cuerpo es demasiado grande' });
    req.destroy(); // ya se respondió: se corta lo que quede por llegar
  } else {
    json(res, 400, { error: 'Cuerpo inválido' });
  }
  return null;
};

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
    const b = await cuerpoOResponder(req, res);
    if (b === null) return;
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
  // Anclado a un solo segmento: /reportes/X/estado con el método equivocado debe
  // caer en 404, no responder aquí "No encontrado" y ocultar el error de uso.
  if (/^\/reportes\/[^/]+$/.test(ruta) && req.method === 'GET') {
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
  if (/^\/reportes\/[^/]+\/estado$/.test(ruta) && req.method === 'POST') {
    const codigo = decodeURIComponent(ruta.split('/')[2]).trim().toUpperCase();
    const r = datos.reportes[codigo];
    if (!r) return json(res, 404, { error: 'No existe un reporte con ese código' });

    const b = await cuerpoOResponder(req, res);
    if (b === null) return;
    const estado = b.estado || 'Verificado';
    r.estado = estado;
    r.cronologia.push({ estado, nota: b.nota || '', fecha: new Date().toISOString() });
    guardar();

    console.log(`[api] ${codigo} → ${estado}`);
    return json(res, 200, { codigo, estado });
  }

  // ── Registro censal (brigadista) ────────────────────────────────────────────
  if (ruta === '/censo' && req.method === 'POST') {
    const b = await cuerpoOResponder(req, res);
    if (b === null) return;

    // Sin consentimiento no se persiste (Ley 1581 de 2012).
    //
    // Comparación ESTRICTA a propósito: un truthy check dejaba pasar la cadena "no",
    // que es justo lo que manda un nodo de WhatsApp que captura texto. `!"no"` es
    // false, la validación no disparaba, y se persistían nombre, dirección y jefe de
    // hogar sin autorización real. Solo el booleano true o la cadena "true"/"si"
    // cuentan como consentimiento.
    const autoriza =
      b.consentimiento === true ||
      ['true', 'si', 'sí', '1'].includes(String(b.consentimiento).trim().toLowerCase());

    if (!autoriza) {
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
  //
  // Vuelca teléfonos, direcciones y jefes de hogar: datos personales de la Ley 1581.
  // La red interna de Docker es la primera barrera, pero no puede ser la única —
  // basta que otro contenedor comparta la red `edge` para que quede al alcance.
  // Requiere clave; si no está configurada, la ruta no existe.
  if (ruta === '/todo' && req.method === 'GET') {
    const clave = process.env.CLAVE_ADMIN || '';
    if (!clave) return json(res, 404, { error: 'Ruta no habilitada' });
    if (req.headers['x-api-key'] !== clave) {
      console.warn('[api] intento de acceso a /todo sin clave válida');
      return json(res, 401, { error: 'No autorizado' });
    }
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
