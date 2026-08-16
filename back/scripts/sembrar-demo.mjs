/**
 * Llena la base con reportes de demostración por los tres canales.
 *
 * Por qué existe: la base arrancaba con doce reportes, todos en «Reportado» y
 * ninguno por teléfono. Con eso el tablero del gestor sale vacío, las
 * estadísticas dan cero atendidos y la cronología —que es lo que diferencia a
 * este producto— no se puede enseñar: no hay ningún caso que haya avanzado.
 *
 * Por qué contra la API y no con INSERT: así se recorre el mismo camino que hará
 * un ciudadano de verdad. Si un endpoint está roto, este script falla, y eso es
 * exactamente lo que se quiere saber antes de una demostración. Además la
 * cronología y los códigos los genera el backend, no el script.
 *
 * TODOS LOS DATOS SON INVENTADOS. Nombres, teléfonos y direcciones son
 * ficticios a propósito: el repositorio es público y la Ley 1581 de 2012 protege
 * lo que aquí se maneja (ver CLAUDE.md). Nunca sembrar datos de personas reales.
 *
 * Uso:
 *   node back/scripts/sembrar-demo.mjs
 *   API=http://localhost:5000 node back/scripts/sembrar-demo.mjs
 */

const API = process.env.API ?? 'http://localhost:5000';
const CLAVE_INGESTA = process.env.CLAVE_INGESTA ?? 'clave-de-servicio-solo-para-desarrollo-local';
const CLAVE_DEMO = process.env.CLAVE_DEMO ?? 'Demo1234!';

const log = (...a) => console.log(...a);

/** Falla ruidosamente: un sembrado a medias es peor que ninguno. */
async function pedir(ruta, opciones = {}) {
  const respuesta = await fetch(`${API}${ruta}`, {
    ...opciones,
    headers: { 'Content-Type': 'application/json', ...(opciones.headers ?? {}) },
  });

  const texto = await respuesta.text();
  if (!respuesta.ok) {
    throw new Error(`${opciones.method ?? 'GET'} ${ruta} → ${respuesta.status}\n${texto.slice(0, 400)}`);
  }
  return texto ? JSON.parse(texto) : null;
}

/*
 * Municipios con emergencias reales y recurrentes en Colombia. Se usan los
 * nombres de los municipios —que son públicos— con direcciones inventadas.
 */
const PORWHATSAPP = [
  {
    telefono: '573001112233',
    nombreContacto: 'Luz Marina',
    clase: 'afectacion_propia',
    tipo: 'Inundacion',
    descripcion: 'El río se creció anoche y el agua entró a la casa, alcanzó como medio metro',
    ubicacionTexto: 'Mocoa, barrio San Miguel, cerca del puente',
    nivelDano: 'Averiada — NO habitable',
    necesidad: 'AHE alimentaria',
  },
  {
    telefono: '573002223344',
    nombreContacto: 'Jairo',
    clase: 'aviso_evento',
    tipo: 'Deslizamiento',
    descripcion: 'Se vino la tierra sobre la vía y hay carros varados de lado y lado',
    ubicacionTexto: 'Manizales, vía al Magdalena, kilómetro 8',
  },
  {
    telefono: '573003334455',
    nombreContacto: 'Rosa Elena',
    clase: 'afectacion_propia',
    tipo: 'Vendaval',
    descripcion: 'El viento se llevó el techo de zinc, quedamos sin cubierta y está lloviendo',
    ubicacionTexto: 'Ciénaga, corregimiento Palmira',
    nivelDano: 'Averiada — habitable',
    necesidad: 'Materiales de rehabilitación',
  },
  {
    telefono: '573004445566',
    nombreContacto: 'Wilson',
    clase: 'aviso_evento',
    tipo: 'Incendio',
    descripcion: 'Hay un incendio en el rastrojo subiendo por la loma, el humo se ve desde el pueblo',
    ubicacionTexto: 'Santa Fe de Antioquia, vereda El Espinal',
  },
];

const PORTELEFONO = [
  {
    telefono: '573101112233',
    nombreContacto: 'Gilberto',
    clase: 'afectacion_propia',
    tipo: 'AvenidaTorrencial',
    descripcion: 'Bajó una avalancha por la quebrada y se llevó parte del solar y el corral',
    ubicacionTexto: 'Salgar, vereda La Margarita',
    nivelDano: 'Destruida',
    necesidad: 'Subsidio de arriendo',
    canal: 'Telefono',
  },
  {
    telefono: '573102223344',
    nombreContacto: 'Dora',
    clase: 'aviso_evento',
    tipo: 'ColapsoEstructural',
    descripcion: 'Se cayó parte de una casa vieja de dos pisos después de las lluvias de anoche',
    ubicacionTexto: 'Girardot, barrio Kennedy, calle principal',
    canal: 'Telefono',
  },
  {
    telefono: '573103334455',
    nombreContacto: 'Hernando',
    clase: 'afectacion_propia',
    tipo: 'Sismo',
    descripcion: 'Con el temblor se agrietaron las paredes y nos da miedo dormir adentro',
    ubicacionTexto: 'Los Santos, casco urbano',
    nivelDano: 'Averiada — NO habitable',
    necesidad: 'AHE no alimentaria',
    canal: 'Telefono',
  },
];

const PORWEB = [
  {
    tipo: 'Inundacion',
    descripcion: 'El caño se desbordó y el agua está entrando a las casas de la orilla',
    municipio: 'Soledad',
    direccion: 'Carrera 18 con calle 30',
    latitud: 10.9184,
    longitud: -74.7646,
  },
  {
    tipo: 'ViaAfectada',
    descripcion: 'La banca de la vía se hundió y solo pasa un carril, hay riesgo de que ceda',
    municipio: 'Ibagué',
    direccion: 'Vía al Nevado, sector La Cascada',
    latitud: 4.4389,
    longitud: -75.2322,
  },
  {
    tipo: 'Deslizamiento',
    descripcion: 'Se está abriendo una grieta grande en la ladera arriba de las viviendas',
    municipio: 'Bello',
    direccion: 'Barrio París, parte alta',
    latitud: 6.3378,
    longitud: -75.5628,
  },
];

/*
 * Cómo avanza cada caso. Se reparte a propósito: unos cerrados para que las
 * estadísticas muestren porcentaje de atención, otros a medio camino para que la
 * cronología se vea con pasos pendientes, y algunos recién llegados porque así
 * es como se ve una bandeja de verdad.
 */
const AVANCES = [
  ['Verificado', 'Bomberos confirmó el evento en el sitio'],
  ['Asignado', 'Asignado al CMGRD del municipio'],
  ['EnAtencion', 'Comisión en terreno atendiendo la emergencia'],
  ['Atendido', 'Entregada ayuda humanitaria de emergencia'],
  ['Cerrado', 'Caso cerrado: familia reubicada y ayuda entregada'],
];

async function sembrar() {
  log(`Sembrando contra ${API}\n`);

  const salud = await pedir('/health').catch(() => null);
  if (!salud) throw new Error(`El backend no responde en ${API}. ¿Está levantado?`);

  // ── Canales conversacionales ────────────────────────────────────────────
  const codigos = [];
  const porIngesta = [...PORWHATSAPP, ...PORTELEFONO];

  for (const reporte of porIngesta) {
    const creado = await pedir('/api/ingesta/reportes', {
      method: 'POST',
      headers: { 'X-Api-Key': CLAVE_INGESTA },
      body: JSON.stringify(reporte),
    });
    codigos.push(creado.codigo);
    log(`  ${(reporte.canal ?? 'WhatsApp').padEnd(9)} ${creado.codigo}  ${reporte.tipo}`);
  }

  // ── Canal web: requiere sesión, como cualquier ciudadano ────────────────
  const { token } = await pedir('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'ciudadano@conectariesgoai.demo', password: CLAVE_DEMO }),
  });

  for (const reporte of PORWEB) {
    const creado = await pedir('/api/reportes', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(reporte),
    });
    codigos.push(creado.codigo);
    log(`  Web       ${creado.codigo}  ${reporte.tipo}`);
  }

  // ── Avance de estados: es lo que da cuerpo a la cronología ──────────────
  const { token: tokenGestor } = await pedir('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'gestor@conectariesgoai.demo', password: CLAVE_DEMO }),
  });

  log('\nAvanzando estados:');
  for (const [indice, codigo] of codigos.entries()) {
    // Los tres últimos se dejan recién reportados: una bandeja real tiene
    // casos sin tocar, y el gestor necesita ver algo pendiente que hacer.
    if (indice >= codigos.length - 3) continue;

    const hasta = (indice % AVANCES.length) + 1;
    for (const [estado, nota] of AVANCES.slice(0, hasta)) {
      await pedir(`/api/reportes/${codigo}/estado`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${tokenGestor}` },
        body: JSON.stringify({ estado, nota }),
      });
    }
    log(`  ${codigo} → ${AVANCES[hasta - 1][0]}`);
  }

  const resumen = await pedir('/api/estadisticas/resumen');
  log('\nResumen tras sembrar:');
  log(`  reportes hoy:  ${resumen.totalHoy}`);
  log(`  atendidos:     ${resumen.atendidos} (${resumen.porcentajeAtendidos}%)`);
  log(`  por canal:     ${JSON.stringify(resumen.porCanal)}`);
}

sembrar().catch((e) => {
  console.error(`\nFalló el sembrado: ${e.message}`);
  process.exit(1);
});
