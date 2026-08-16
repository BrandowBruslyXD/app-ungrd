/**
 * APIs de demostración para probar flujos de punta a punta.
 *
 * El bot de Holy Cosmetics choca contra el mismo muro en el 21% de las conversaciones:
 * no puede consultar inventario (13% pregunta por disponibilidad) ni el estado de las
 * guías (8% pregunta por su pedido). Conectar Shopify y Melonn de verdad exige
 * autorizaciones del cliente, así que estos endpoints devuelven datos realistas con la
 * misma forma, para poder probar el flujo completo mientras tanto.
 *
 * Los productos y precios son REALES: salen del catálogo reconstruido del histórico.
 * El stock y los estados de guía son simulados, pero DETERMINISTAS — el mismo producto
 * o el mismo número de pedido devuelven siempre lo mismo, para que las pruebas sean
 * reproducibles.
 *
 * Sin dependencias: solo el http de Node.
 *
 *   GET  /health
 *   GET  /shopify/products?q=texto&limit=5     buscar en el catálogo
 *   GET  /shopify/products/:id                 detalle con stock
 *   POST /shopify/orders                       crear pedido (borrador)
 *   GET  /shopify/orders/:numero               consultar pedido
 *   GET  /melonn/tracking/:referencia          estado del envío
 *   GET  /shipping/quote?ciudad=Medellin&total=150000   costo de envío
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PUERTO = process.env.PORT || 4100;

/**
 * Clave para las operaciones de ESCRITURA. Al quedar la API accesible desde internet
 * (LETY es un SaaS y necesita alcanzarla), crear pedidos sin ninguna barrera dejaría a
 * cualquiera llenando la base de pedidos falsos.
 *
 * La LECTURA se deja abierta a propósito: el catálogo y los precios ya son públicos en
 * holycosmetics.com.co, y una clave en las consultas obligaría a configurar cabeceras en
 * cada plataforma que se pruebe sin proteger nada que no esté ya publicado.
 */
const API_KEY = process.env.DEMO_API_KEY || '';
const CATALOGO = JSON.parse(fs.readFileSync(path.join(__dirname, 'catalogo.json'), 'utf8'));

/** Identificador estable a partir del nombre: "Blow Out Duo Holy" → "blow-out-duo-holy". */
const slug = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Hash estable de una cadena: misma entrada, mismo número, siempre. */
function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Se enriquece el catálogo una vez, al arrancar.
const PRODUCTOS = CATALOGO.map((p) => {
  const id = slug(p.producto);
  const h = hash(id);
  // ~15% agotado y ~10% en preventa: proporciones parecidas a las del negocio real,
  // donde la preventa aparece de forma recurrente en el histórico.
  const agotado = h % 100 < 15;
  const preventa = !agotado && h % 100 < 25;
  return {
    id,
    titulo: p.producto,
    categoria: p.categoria,
    precio_cop: p.precio_cop,
    url: `https://holycosmetics.com.co/products/${id}`,
    stock: agotado ? 0 : (h % 40) + 1,
    disponible: !agotado,
    preventa,
    fecha_llegada: preventa ? '2026-08-20' : null,
    garantia_meses: 6,
    voltaje: /cepillo|plancha|secador|rizador|alisador/i.test(p.producto) ? '110V' : null,
  };
});

// Costos de envío observados en el histórico; el resto se estima por región.
const ENVIOS = {
  bogota: 10000, medellin: 13000, cali: 12000, barranquilla: 12698, manizales: 13000,
  cartagena: 14000, bucaramanga: 13500, pereira: 12500, ibague: 12000, cucuta: 15000,
  'santa marta': 14500, villavicencio: 13000, pasto: 16000, neiva: 13500, armenia: 12500,
};
const ESPECIALES = ['leticia', 'san andres', 'mitu', 'puerto carreno', 'inirida'];

// Pedidos creados en memoria (se pierden al reiniciar: es un entorno de pruebas).
const PEDIDOS = new Map();
let secuencia = 6100;

const ESTADOS = [
  {estado: 'en_preparacion', detalle: 'El pedido está siendo alistado en bodega.'},
  {estado: 'en_transito', detalle: 'En camino con la transportadora Coordinadora.'},
  {estado: 'en_reparto', detalle: 'Salió a reparto hoy; se entrega antes de las 8 p.m.'},
  {estado: 'entregado', detalle: 'Entregado y firmado por el destinatario.'},
  {estado: 'novedad', detalle: 'La transportadora reportó una novedad: dirección incompleta.'},
];

function normaliza(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

function json(res, code, cuerpo) {
  const txt = JSON.stringify(cuerpo, null, 1);
  res.writeHead(code, {'Content-Type': 'application/json; charset=utf-8'});
  res.end(txt);
}

function leerCuerpo(req) {
  return new Promise((resolve) => {
    let d = '';
    req.on('data', (c) => (d += c));
    req.on('end', () => {
      try { resolve(JSON.parse(d || '{}')); } catch { resolve({}); }
    });
  });
}

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PUERTO}`);
  const ruta = url.pathname.replace(/\/+$/, '') || '/';
  const log = (m) => console.log(`[demo-api] ${req.method} ${ruta} → ${m}`);

  // ── salud ──
  if (ruta === '/health') return json(res, 200, {ok: true, productos: PRODUCTOS.length});

  // ── catálogo: búsqueda ──
  if (ruta === '/shopify/products' && req.method === 'GET') {
    const q = normaliza(url.searchParams.get('q'));
    const limite = Math.min(parseInt(url.searchParams.get('limit') || '5', 10) || 5, 20);
    let hallados = PRODUCTOS;
    if (q) {
      const palabras = q.split(/\s+/).filter((w) => w.length > 2);
      hallados = PRODUCTOS
        .map((p) => {
          const texto = normaliza(p.titulo + ' ' + p.categoria);
          const puntos = palabras.filter((w) => texto.includes(w)).length;
          return {p, puntos};
        })
        .filter((x) => x.puntos > 0)
        .sort((a, b) => b.puntos - a.puntos || a.p.precio_cop - b.p.precio_cop)
        .map((x) => x.p);
    }
    log(`${hallados.length} resultados para "${q || 'todo'}"`);
    return json(res, 200, {
      total: hallados.length,
      productos: hallados.slice(0, limite),
      // Se dice explícitamente cuando no hay nada, para que el agente no improvise.
      mensaje: hallados.length ? undefined : 'No hay productos que coincidan. No ofrecer alternativas inventadas.',
    });
  }

  // ── catálogo: detalle ──
  if (ruta.startsWith('/shopify/products/') && req.method === 'GET') {
    const id = ruta.split('/').pop();
    const p = PRODUCTOS.find((x) => x.id === id);
    if (!p) { log('no encontrado'); return json(res, 404, {error: 'Producto no encontrado'}); }
    log(`${p.titulo} · stock ${p.stock}`);
    return json(res, 200, p);
  }

  // ── costo de envío ──
  if (ruta === '/shipping/quote' && req.method === 'GET') {
    const ciudad = normaliza(url.searchParams.get('ciudad'));
    const total = parseInt(url.searchParams.get('total') || '0', 10) || 0;
    if (!ciudad) return json(res, 400, {error: 'Falta el parámetro ciudad'});
    const especial = ESPECIALES.some((e) => ciudad.includes(e));
    const base = ENVIOS[ciudad] ?? (especial ? 26500 : 14000);
    const gratis = total >= 200000;
    log(`${ciudad} · total ${total} · ${gratis ? 'gratis' : base}`);
    return json(res, 200, {
      ciudad: url.searchParams.get('ciudad'),
      costo_cop: gratis ? 0 : base,
      envio_gratis: gratis,
      motivo_gratis: gratis ? 'Compra igual o superior a $200.000' : null,
      dias_habiles: especial ? '4 a 7' : '2 a 4',
      transportadora: 'Coordinadora',
      trayecto_especial: especial,
      // Solo se afirma lo que se sabe; el resto es estimación regional.
      exacto: ENVIOS[ciudad] !== undefined,
    });
  }

  // ── crear pedido ──
  if (ruta === '/shopify/orders' && req.method === 'POST') {
    if (API_KEY && req.headers['x-api-key'] !== API_KEY) {
      log('rechazado: clave invalida o ausente');
      return json(res, 401, {error: 'Falta la cabecera x-api-key o no es valida.'});
    }
    const b = await leerCuerpo(req);
    const faltan = ['datos', 'formaPago'].filter((k) => !String(b[k] ?? '').trim());
    if (faltan.length) {
      log(`rechazado, faltan ${faltan.join(',')}`);
      return json(res, 400, {error: `Faltan campos: ${faltan.join(', ')}`});
    }
    const numero = `#${++secuencia}`;
    const pedido = {
      numero,
      estado: 'borrador',
      datos_cliente: b.datos,
      forma_pago: b.formaPago,
      contraentrega: /contraentrega|contra entrega/i.test(b.formaPago || ''),
      productos: b.productos || null,
      total_cop: b.total_cop || null,
      creado: new Date().toISOString(),
      nota: 'Pedido en borrador: un asesor lo confirma antes de despachar.',
    };
    PEDIDOS.set(numero.replace('#', ''), pedido);
    log(`creado ${numero}`);
    return json(res, 201, pedido);
  }

  // ── consultar pedido ──
  if (ruta.startsWith('/shopify/orders/') && req.method === 'GET') {
    const num = ruta.split('/').pop().replace('#', '');
    const p = PEDIDOS.get(num);
    if (!p) { log(`pedido ${num} no existe`); return json(res, 404, {error: 'Pedido no encontrado'}); }
    return json(res, 200, p);
  }

  // ── estado del envío ──
  if (ruta.startsWith('/melonn/tracking/') && req.method === 'GET') {
    const ref = ruta.split('/').pop().replace('#', '');
    if (!/^\d{3,12}$/.test(ref)) {
      log(`referencia invalida "${ref}"`);
      return json(res, 400, {error: 'La referencia debe ser el número de pedido o la cédula.'});
    }
    const h = hash(ref);
    const e = ESTADOS[h % ESTADOS.length];
    const dias = (h % 5) + 1;
    log(`${ref} → ${e.estado}`);
    return json(res, 200, {
      referencia: ref,
      guia: `679${String(h).slice(0, 8)}`,
      transportadora: 'Coordinadora',
      ...e,
      dias_desde_despacho: dias,
      entrega_estimada: e.estado === 'entregado' ? null : '2026-08-0' + Math.min(9, dias + 4),
      // El histórico muestra que la preventa es la causa habitual de una guía sin movimiento.
      preventa: h % 7 === 0,
    });
  }

  json(res, 404, {error: 'Ruta no encontrada', rutas: [
    '/health', '/shopify/products?q=', '/shopify/products/:id', '/shipping/quote?ciudad=&total=',
    'POST /shopify/orders', '/shopify/orders/:numero', '/melonn/tracking/:referencia',
  ]});
});

servidor.listen(PUERTO, () => {
  console.log(`[demo-api] escuchando en :${PUERTO} con ${PRODUCTOS.length} productos`);
  console.log(`[demo-api] escritura ${API_KEY ? 'protegida con x-api-key' : 'SIN PROTEGER (DEMO_API_KEY vacia)'}`);
  const agotados = PRODUCTOS.filter((p) => !p.disponible).length;
  const preventa = PRODUCTOS.filter((p) => p.preventa).length;
  console.log(`[demo-api] ${agotados} agotados · ${preventa} en preventa (deterministas)`);
});
