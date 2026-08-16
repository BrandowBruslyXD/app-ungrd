/**
 * Descarga el set de fotografías de la aplicación y escribe el manifiesto de
 * licencias en `public/imagenes/CREDITOS.json`.
 *
 * Uso:  node scripts/descargar-fotos.mjs
 *
 * ── Por qué este script existe y por qué aborta ───────────────────────────────
 *
 * Unsplash sirve dos catálogos por la misma API: el gratuito bajo Unsplash
 * License y **Unsplash+**, que es de suscripción paga. En el JSON solo se
 * distinguen por dos banderas, `plus` y `premium`, que es fácil pasar por alto:
 * de hecho en la primera descarga se colaron dos fotos de pago acreditadas a
 * Getty Images.
 *
 * Por eso la comprobación de licencia va antes de la descarga y **termina el
 * proceso con error** en vez de avisar. Este repositorio es público y el sistema
 * es gratuito: una imagen de pago aquí es un problema legal, no un detalle.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DESTINO = join(RAIZ, 'public', 'imagenes');

/**
 * ── Criterio de selección ─────────────────────────────────────────────────────
 *
 * 1. **Colombia.** La primera tanda tenía la portada en Sri Lanka, el brigadista
 *    en Canadá y el rescate en Indonesia. Se veían bien, pero un producto para
 *    municipios colombianos ilustrado con paisajes que no son de aquí se nota, y
 *    en un jurado local se nota más. Seis de las siete son colombianas y su
 *    ubicación queda registrada en el manifiesto.
 *
 * 2. **Sin texto en otro idioma.** Nada de vallas, letreros ni carrocerías con
 *    rótulos: se prefieren paisajes, vistas aéreas y objetos en primer plano,
 *    donde no aparece escritura de ningún tipo.
 *
 * 3. **Sin rostros identificables.** Ni de damnificados, por dignidad, ni de
 *    nadie en primer plano, porque la licencia de Unsplash cubre la foto pero no
 *    los derechos de imagen de la persona retratada.
 */
const SELECCION = [
  { id: 'uzDKu--eFMU', archivo: 'ladera-viviendas', anchos: [1600, 800], uso: 'Portada de la landing' },
  { id: 'bCuTsPvygqE', archivo: 'veredas-atardecer', anchos: [800, 400], uso: 'Tarjeta de rol Ciudadano' },
  // Excepción consciente: no hay ninguna foto de organismos de socorro
  // colombianos con licencia libre en Unsplash. Se probó un primer plano de un
  // casco para no salir del país, pero recortado no se entendía qué era. Un
  // bote de rescate en zona inundada se lee de inmediato y es además el evento
  // más frecuente del país, así que aquí pesa más que se entienda.
  { id: '_hlDpQwfQnY', archivo: 'rescate-inundacion', anchos: [800, 400], uso: 'Tarjeta de rol Socorro' },
  { id: 'UF7NdgkLBBU', archivo: 'recorrido-en-campo', anchos: [800, 400], uso: 'Tarjeta de rol Brigadista' },
  { id: 'kMO9FvbJM7E', archivo: 'valle-rio-aereo', anchos: [800, 400], uso: 'Tarjeta de rol Gestor' },
  { id: 'dWUFfoNlVcg', archivo: 'municipio-aereo', anchos: [1200, 600], uso: 'Panel lateral del ingreso' },
  { id: 'SHn194Uaaho', archivo: 'pueblo-jerico', anchos: [1200, 600], uso: 'Sección de cómo funciona' },

  // Bandas de encabezado de las pantallas internas. Sin ellas la aplicación es
  // solo color plano; con ellas cada vista se ancla a un lugar reconocible.
  { id: 'YXvP3etIEsg', archivo: 'via-rural-verde', anchos: [1200, 600], uso: 'Banda del inicio del ciudadano' },
  { id: '9aQgNay52u0', archivo: 'ladera-nubes', anchos: [1200, 600], uso: 'Banda de reportar emergencia' },
  { id: 'TCvNbyLkXkk', archivo: 'montanas-nubladas', anchos: [1200, 600], uso: 'Banda de alertas' },
  { id: 'nUCt1PjRNHE', archivo: 'ganado-pastizal', anchos: [1200, 600], uso: 'Banda de ayudas disponibles' },
  { id: 'znK7mL8bF9E', archivo: 'bosque-cocora', anchos: [1200, 600], uso: 'Banda de los paneles operativos' },

  // Banco para la banda rotatoria de la portada: el territorio que se protege,
  // visto desde varios municipios. Todas colombianas, sin rostros ni letreros.
  { id: 'MlL4XUFK4H4', archivo: 'casa-en-ladera', anchos: [1200, 600], uso: 'Banda rotatoria · El Retiro' },
  { id: '0VFHozu1MEw', archivo: 'casa-blanca-montanas', anchos: [1200, 600], uso: 'Banda rotatoria · Villa de Leyva' },
  { id: 'JTQpBLXa61Y', archivo: 'ovejas-ladera', anchos: [1200, 600], uso: 'Banda rotatoria · Cocora' },
  { id: 'luRCCsvD6pg', archivo: 'montana-entre-nubes', anchos: [1200, 600], uso: 'Banda rotatoria · Cocora' },
  { id: '-LDOL_vl13o', archivo: 'camino-entre-arboles', anchos: [1200, 600], uso: 'Banda rotatoria · Colombia' },
  { id: 'iCYL9HvA4Vw', archivo: 'cerca-y-escalones', anchos: [1200, 600], uso: 'Banda rotatoria · Guatapé' },
];

async function json(url) {
  const respuesta = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!respuesta.ok) {
    throw new Error(`HTTP ${respuesta.status} al consultar ${url}`);
  }
  return respuesta.json();
}

/** Aborta si la foto no es de uso libre. Sin excepciones ni avisos blandos. */
function exigirLicenciaLibre(foto) {
  if (foto.plus || foto.premium) {
    throw new Error(
      `LICENCIA: la foto ${foto.id} ("${foto.user?.name}") es Unsplash+ de pago. ` +
        `No se puede usar en este proyecto. Búscale reemplazo con plus=false y premium=false.`,
    );
  }
}

await mkdir(DESTINO, { recursive: true });

const creditos = [];
let totalKb = 0;

for (const item of SELECCION) {
  const foto = await json(`https://unsplash.com/napi/photos/${item.id}`);
  exigirLicenciaLibre(foto);

  for (const ancho of item.anchos) {
    const url = `${foto.urls.raw}&w=${ancho}&q=72&fm=jpg&fit=crop&auto=format`;
    const respuesta = await fetch(url);
    if (!respuesta.ok) {
      throw new Error(`Descarga fallida de ${item.id} a ${ancho}px: HTTP ${respuesta.status}`);
    }
    const bytes = Buffer.from(await respuesta.arrayBuffer());
    await writeFile(join(DESTINO, `${item.archivo}-${ancho}.jpg`), bytes);
    totalKb += bytes.length / 1024;
    console.log(`  ${`${item.archivo}-${ancho}.jpg`.padEnd(38)} ${(bytes.length / 1024).toFixed(0)} KB`);
  }

  const ubicacion =
    [foto.location?.city, foto.location?.country].filter(Boolean).join(', ') || 'sin ubicación';

  if (!/colombia|colômbia|kolumbien/i.test(ubicacion)) {
    console.log(`     ⚠ ${item.archivo}: ${ubicacion} — no es de Colombia, revisar si conviene`);
  }

  creditos.push({
    archivo: item.archivo,
    uso: item.uso,
    descripcion: foto.alt_description ?? foto.description ?? '',
    ubicacion,
    autor: foto.user.name,
    perfil: `https://unsplash.com/@${foto.user.username}`,
    origen: `https://unsplash.com/photos/${item.id}`,
    licencia: 'Unsplash License',
    licenciaUrl: 'https://unsplash.com/license',
    usoComercial: true,
    atribucionObligatoria: false,
    verificadoSinSuscripcion: true,
  });
}

await writeFile(
  join(DESTINO, 'CREDITOS.json'),
  JSON.stringify(
    {
      _nota:
        'Todas las fotos son Unsplash License: uso libre, comercial y no comercial, sin atribución obligatoria. Se acredita igual por buena práctica. Verificado que ninguna es Unsplash+ de pago.',
      fotos: creditos,
    },
    null,
    2,
  ) + '\n',
  'utf8',
);

console.log(`\n${creditos.length} fotos, ${totalKb.toFixed(0)} KB en total. Licencias verificadas.`);
