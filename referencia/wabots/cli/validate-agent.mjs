#!/usr/bin/env node
/**
 * Validación CRUZADA: el agente construye un flujo → el MOTOR REAL de producción
 * lo ejecuta (simulate-graph). Verifica que lo generado es realmente conversable,
 * no solo que el propio agente diga "0 problemas".
 */
const URL = (process.env.WABOTS_URL || 'https://wabots.72.60.125.180.nip.io').replace(/\/+$/, '');
const USER = process.env.WABOTS_USER || 'ldikay99';
const PASS = process.env.WABOTS_PASS || '';
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

// Reproduce una conversación contra el motor real, encadenando el estado.
async function converse(graph, turns) {
  let state = null;
  const log = [];
  for (const msg of turns) {
    const body = { graph, message: msg };
    if (state) body.state = state;
    const d = await api('/flows/simulate-graph', body);
    const bot = (d.outgoing || []).map((o) => o.text + (o.options ? ` [${o.options.map((x) => x.label).join(' | ')}]` : '')).join(' / ');
    log.push({ user: msg, bot: bot.slice(0, 120), node: d.currentNodeId, ended: d.ended });
    state = { variables: d.variables || {}, currentNodeId: d.currentNodeId };
    if (d.ended) break;
  }
  return log;
}

const CASES = [
  {
    name: 'Interactivo (barbería, menú con ramas)',
    build: { message: 'Bot interactivo de barbería: saludo, menú con botones (Ver servicios, Agendar, Hablar con alguien). Ver servicios muestra precios y vuelve al menú. Agendar pide nombre y fecha y crea la cita. Hablar con alguien transfiere a humano.' },
    turns: ['hola', 'Ver servicios', 'Agendar', 'Juan Pérez', 'mañana a las 3pm'],
  },
  {
    name: 'Con IA + agendamiento (clínica)',
    build: { message: 'Bot con IA para una clínica dental que resuelve dudas y, al querer agendar, captura nombre, motivo y fecha y crea la cita.', llm: { provider: 'deepseek', model: 'deepseek-chat', apiKey: process.env.DS_KEY } },
    turns: ['hola, atienden ortodoncia?', 'quiero agendar una cita', 'Ana Gómez', 'limpieza dental', 'el viernes a las 10am'],
    injectKey: true,
  },
  {
    name: 'Experto (restaurante)',
    build: { message: 'Bot de restaurante: carta, reservar mesa (nombre, personas, fecha) y hacer pedido. Opción de hablar con humano.', mode: 'expert' },
    turns: ['hola', 'Reservar mesa', 'Carlos', '4 personas', 'sábado 8pm'],
  },
];

function check(graph, convo) {
  const issues = [];
  if (!graph.nodes.length) issues.push('grafo vacío');
  if (!graph.nodes.some((n) => n.type === 'trigger')) issues.push('sin trigger');
  // El motor debe haber respondido algo en el primer turno.
  if (!convo[0]?.bot) issues.push('el bot no respondió al saludo inicial');
  // Ningún turno debió devolver el error genérico del simulador NI el fallback de IA.
  const errored = convo.find((t) => /Error al simular|no pude iniciar|⚠️|tuve un problema para responder/i.test(t.bot));
  if (errored) issues.push(`error/fallback en: "${errored.user}" → "${errored.bot.slice(0, 50)}"`);
  // Debe haber avanzado de nodo en algún momento (no quedarse pegado).
  const nodes = new Set(convo.map((t) => t.node));
  if (nodes.size < 2 && convo.length > 2) issues.push('el flujo no avanzó entre nodos');
  return issues;
}

async function main() {
  TOKEN = (await api('/auth/login', { username: USER, password: PASS })).token;
  let pass = 0;
  for (const c of CASES) {
    process.stdout.write(`\n▶ ${c.name}\n`);
    try {
      const built = await api('/flow-agent/build', { ...c.build, context: { flowName: c.name } });
      process.stdout.write(`  build: ${built.graph.nodes.length} nodos, ${built.graph.edges.length} conexiones, auto-validación: ${built.problems.length ? built.problems.length + ' avisos' : 'OK'}\n`);
      // Inyecta la key DeepSeek en los nodos aiAgent (simula lo que hace el admin en producción).
      if (process.env.DS_KEY) {
        for (const n of built.graph.nodes) {
          if (n.type === 'aiAgent') { n.data = { ...n.data, llmMode: 'node', provider: 'deepseek', model: 'deepseek-chat', apiKey: process.env.DS_KEY }; }
        }
      }
      const convo = await converse(built.graph, c.turns);
      for (const t of convo) process.stdout.write(`    👤 ${t.user}\n    🤖 ${t.bot || '(silencio)'}\n`);
      const issues = check(built.graph, convo);
      if (issues.length === 0) { process.stdout.write(`  ✅ EJECUTA BIEN en el motor real\n`); pass++; }
      else process.stdout.write(`  ❌ PROBLEMAS: ${issues.join('; ')}\n`);
    } catch (e) {
      process.stdout.write(`  ❌ FALLÓ: ${e.message}\n`);
    }
  }
  process.stdout.write(`\n${'='.repeat(50)}\nRESULTADO: ${pass}/${CASES.length} flujos ejecutan correctamente en el motor real.\n`);
}
main().catch((e) => { console.error(e); process.exit(1); });
