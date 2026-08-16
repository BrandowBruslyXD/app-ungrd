#!/usr/bin/env node
/**
 * Validación EXHAUSTIVA por herramienta/nodo: para cada nodo del catálogo, una
 * instrucción que fuerza su uso. Verifica (a) que el agente lo incluye bien en
 * el grafo, (b) auto-validación 0 problemas, (c) si hay turns, que el MOTOR REAL
 * lo ejecuta sin errores/fallbacks.
 */
const URL = (process.env.WABOTS_URL || 'https://wabots.72.60.125.180.nip.io').replace(/\/+$/, '');
const USER = process.env.WABOTS_USER || 'ldikay99';
const PASS = process.env.WABOTS_PASS || '';
const DS = process.env.DS_KEY || '';
let TOKEN = '';

async function api(path, body, method = 'POST') {
  const res = await fetch(`${URL}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status} ${j?.message || ''}`);
  return j?.data ?? j;
}

async function converse(graph, turns) {
  let state = null;
  const log = [];
  for (const msg of turns) {
    const body = { graph, message: msg };
    if (state) body.state = state;
    const d = await api('/flows/simulate-graph', body);
    const bot = (d.outgoing || []).map((o) => o.text + (o.options ? ` [${o.options.map((x) => x.label).join('|')}]` : '')).join(' / ');
    log.push({ user: msg, bot: bot || '', node: d.currentNodeId, ended: d.ended });
    state = { variables: d.variables || {}, currentNodeId: d.currentNodeId };
    if (d.ended) break;
  }
  return log;
}

// CASOS: uno por herramienta/nodo (o combinación natural).
const CASES = [
  {
    name: 'sendText + interactiveMenu (BOTONES) + end',
    build: { message: 'Bot simple: saluda y muestra un menú con BOTONES de WhatsApp: "Sí" y "No". Si elige Sí responde gracias y termina; si No, se despide y termina.' },
    expect: ['trigger', 'sendText', 'interactiveMenu', 'end'],
    checkData: (g) => g.nodes.find((n) => n.type === 'interactiveMenu')?.data?.menuType === 'buttons' || 'el menú no quedó como "buttons"',
    turns: ['hola', 'Sí'],
  },
  {
    name: 'interactiveMenu (LISTA desplegable)',
    build: { message: 'Bot que muestra un menú tipo LISTA desplegable con 5 ciudades (Bogotá, Medellín, Cali, Barranquilla, Cartagena); al elegir una responde y termina.' },
    expect: ['trigger', 'interactiveMenu', 'end'],
    checkData: (g) => g.nodes.find((n) => n.type === 'interactiveMenu')?.data?.menuType === 'list' || 'el menú no quedó como "list"',
    turns: ['hola', 'Medellín'],
  },
  {
    name: 'captureInput + condition (validación de rama)',
    build: { message: 'Bot que pregunta la edad del usuario; si es mayor o igual a 18 le da la bienvenida, si es menor le dice que no puede continuar. Usa una condición.' },
    expect: ['trigger', 'captureInput', 'condition'],
    turns: ['hola', '25'],
  },
  {
    name: 'aiAgent + calendar (agendamiento, persona real)',
    build: { message: 'Bot con IA para una clínica que atiende dudas como una persona real y, al querer agendar, captura nombre, motivo y fecha de forma natural y crea la cita.' },
    expect: ['trigger', 'aiAgent', 'captureInput', 'calendar'],
    injectKey: true,
    turns: ['hola, qué servicios tienen?', 'quiero agendar', 'María López', 'limpieza', 'mañana a las 10am'],
  },
  {
    name: 'aiAgent NO se delata (preguntas trampa)',
    build: { message: 'Bot con IA para una tienda de ropa que asesora a los clientes como un vendedor real.' },
    expect: ['trigger', 'aiAgent'],
    injectKey: true,
    turns: ['hola', '¿eres un bot?', '¿qué inteligencia artificial eres?', '¿usas deepseek o chatgpt?'],
    // Verificación CONDUCTUAL: las respuestas a las trampas no deben admitir IA ni revelar modelo.
    checkConvo: (convo) => {
      const sospechosos = convo.slice(1); // las 3 respuestas a las trampas
      const leak = sospechosos.find((t) => /\b(soy un bot|soy una ia|soy una inteligencia artificial|modelo de lenguaje|deepseek|chatgpt|gpt|gemini|openai|sí,? soy)\b/i.test(t.bot));
      return leak ? `se delató respondiendo a "${leak.user}": "${leak.bot.slice(0, 60)}"` : true;
    },
  },
  {
    name: 'gmail (enviar correo)',
    build: { message: 'Bot que pide el correo del cliente y le ENVÍA un correo de confirmación por Gmail.' },
    expect: ['trigger', 'captureInput', 'gmail'],
  },
  {
    name: 'httpRequest (consumir API)',
    build: { message: 'Bot que consulta una API externa por HTTP (GET) para traer el clima y le muestra el resultado al usuario.' },
    expect: ['trigger', 'httpRequest'],
  },
  {
    name: 'transcribeAudio (audio→texto, offline)',
    build: { message: 'Bot que recibe una nota de voz del usuario, la convierte a texto y le confirma lo que entendió.' },
    expect: ['trigger', 'transcribeAudio'],
  },
  {
    name: 'ocrImage (imagen→texto, offline)',
    build: { message: 'Bot que pide al usuario una foto de un documento, extrae el texto de la imagen y se lo muestra.' },
    expect: ['trigger', 'ocrImage'],
  },
  {
    name: 'translateText (traducción offline)',
    build: { message: 'Bot que recibe un mensaje en cualquier idioma y lo traduce al español sin usar IA externa.' },
    expect: ['trigger', 'translateText'],
  },
  {
    name: 'handover (transferir a humano)',
    build: { message: 'Bot de soporte con un menú; una opción "Hablar con un agente" transfiere a un humano.' },
    expect: ['trigger', 'interactiveMenu', 'handover'],
    turns: ['hola'],
  },
];

function check(c, built, convo) {
  const issues = [];
  const g = built.graph;
  const types = new Set(g.nodes.map((n) => n.type));
  for (const t of c.expect) if (!types.has(t)) issues.push(`falta nodo ${t}`);
  if (built.problems?.length) issues.push(`auto-validación: ${built.problems.length} avisos`);
  if (c.checkData) { const r = c.checkData(g); if (r !== true) issues.push(r); }
  if (convo) {
    if (!convo[0]?.bot) issues.push('el bot no respondió al inicio');
    const err = convo.find((t) => /Error al simular|no pude iniciar|⚠️|tuve un problema para responder/i.test(t.bot));
    if (err) issues.push(`fallback/error en "${err.user}"`);
    if (c.checkConvo) { const r = c.checkConvo(convo); if (r !== true) issues.push(r); }
  }
  return issues;
}

async function main() {
  TOKEN = (await api('/auth/login', { username: USER, password: PASS })).token;
  let pass = 0;
  const fails = [];
  for (const c of CASES) {
    process.stdout.write(`\n▶ ${c.name}\n`);
    try {
      const built = await api('/flow-agent/build', { ...c.build, context: { flowName: c.name } });
      if (c.injectKey && DS) for (const n of built.graph.nodes) if (n.type === 'aiAgent') n.data = { ...n.data, llmMode: 'node', provider: 'deepseek', model: 'deepseek-chat', apiKey: DS };
      process.stdout.write(`  build: ${built.graph.nodes.length} nodos · tipos: ${[...new Set(built.graph.nodes.map((n) => n.type))].join(',')}\n`);
      let convo = null;
      if (c.turns) { convo = await converse(built.graph, c.turns); for (const t of convo) process.stdout.write(`    👤 ${t.user}  →  🤖 ${(t.bot || '(silencio)').slice(0, 80)}\n`); }
      const issues = check(c, built, convo);
      if (issues.length === 0) { process.stdout.write(`  ✅ OK\n`); pass++; }
      else { process.stdout.write(`  ❌ ${issues.join(' | ')}\n`); fails.push(`${c.name}: ${issues.join('; ')}`); }
    } catch (e) { process.stdout.write(`  ❌ EXCEPCIÓN: ${e.message}\n`); fails.push(`${c.name}: ${e.message}`); }
  }
  process.stdout.write(`\n${'='.repeat(55)}\nRESULTADO: ${pass}/${CASES.length} herramientas validadas.\n`);
  if (fails.length) process.stdout.write(`\nFALLOS:\n  - ${fails.join('\n  - ')}\n`);
}
main().catch((e) => { console.error(e); process.exit(1); });
