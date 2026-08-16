#!/usr/bin/env node
/**
 * wabots-flow — CLI del constructor de flujos de WhatsApp Bots.
 *
 * Mismo motor que el panel (POST /api/flow-agent/build): pídele en lenguaje
 * natural y arma/edita el flujo. Node 18+ (usa fetch nativo, sin dependencias).
 *
 * Config (variables de entorno):
 *   WABOTS_URL    base, ej. https://wabots.72.60.125.180.nip.io  (default: ese)
 *   WABOTS_USER / WABOTS_PASS   credenciales admin  (o WABOTS_TOKEN ya emitido)
 *
 * Comandos:
 *   build "<instrucción>" [--flow <id>] [--expert] [--save] [--new "<nombre>" [--tenant <id>]]
 *   flows                 lista los flujos
 *   templates             lista las plantillas por rubro
 *   rubro <id> [--flow <id>] [--save] [--expert]   construye desde una plantilla
 *
 * Ejemplos:
 *   node wabots-flow.mjs templates
 *   node wabots-flow.mjs build "bot de citas para una barbería" --new "Barbería X" --save
 *   node wabots-flow.mjs build "agrega opción de hablar con humano" --flow <id> --save
 *   node wabots-flow.mjs rubro clinica --new "Clínica Sur" --save --expert
 */

const URL = (process.env.WABOTS_URL || 'https://wabots.72.60.125.180.nip.io').replace(/\/+$/, '');
const USER = process.env.WABOTS_USER || 'ldikay99';
const PASS = process.env.WABOTS_PASS || '';
let TOKEN = process.env.WABOTS_TOKEN || '';

const C = { dim: '\x1b[2m', red: '\x1b[31m', green: '\x1b[32m', cyan: '\x1b[36m', yellow: '\x1b[33m', bold: '\x1b[1m', reset: '\x1b[0m' };
const log = (...a) => console.log(...a);
const die = (msg) => { console.error(`${C.red}✖ ${msg}${C.reset}`); process.exit(1); };

async function api(path, { method = 'POST', body } = {}) {
  const res = await fetch(`${URL}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(`${res.status} ${json?.message || text}`);
  return json?.data ?? json;
}

async function ensureToken() {
  if (TOKEN) return;
  if (!PASS) die('Falta WABOTS_PASS (o WABOTS_TOKEN). Exporta tus credenciales admin.');
  const data = await api('/auth/login', { body: { username: USER, password: PASS } });
  TOKEN = data?.token;
  if (!TOKEN) die('Login falló: no se recibió token.');
}

// Parser de flags simple.
function parseFlags(args) {
  const out = { _: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--expert') out.expert = true;
    else if (a === '--save') out.save = true;
    else if (a === '--flow') out.flow = args[++i];
    else if (a === '--new') out.new = args[++i];
    else if (a === '--tenant') out.tenant = args[++i];
    else out._.push(a);
  }
  return out;
}

function printGraph(graph) {
  log(`${C.bold}🧩 ${graph.nodes.length} nodos · ${graph.edges.length} conexiones${C.reset}`);
  for (const n of graph.nodes) {
    const t = n.data?.body || n.data?.text || n.data?.prompt || n.data?.summary || '';
    log(`  ${C.cyan}[${n.id}]${C.reset} ${n.type} ${C.dim}${String(t).slice(0, 70)}${C.reset}`);
  }
}

async function cmdFlows() {
  await ensureToken();
  const flows = await api('/flows', { method: 'GET' });
  if (!flows.length) return log('(sin flujos)');
  for (const f of flows) log(`  ${C.cyan}${f.id}${C.reset}  ${f.name}  ${C.dim}tenant=${f.tenantId || '—'}${C.reset}`);
}

async function cmdTemplates() {
  await ensureToken();
  const tpls = await api('/flow-agent/templates', { body: {} });
  for (const t of tpls) log(`  ${C.yellow}${t.id}${C.reset}\t${t.emoji} ${t.name} ${C.dim}— ${t.summary} (${t.usesAI ? 'IA' : 'sin IA'})${C.reset}`);
}

async function runBuild(message, flags) {
  await ensureToken();

  // Si --new, crea el flujo primero (vacío) y opera sobre él.
  let flowId = flags.flow;
  let graph = { nodes: [], edges: [] };
  let flowName;
  if (flags.new) {
    const created = await api('/flows', { body: { name: flags.new, ...(flags.tenant ? { tenantId: flags.tenant } : {}) } });
    flowId = created.id;
    flowName = created.name;
    log(`${C.green}✓ flujo creado:${C.reset} ${flowId} (${flowName})`);
  } else if (flowId) {
    const flow = await api(`/flows/${flowId}`, { method: 'GET' });
    graph = flow.graph || graph;
    flowName = flow.name;
  }

  log(`${C.dim}▶ ${flags.expert ? '[experto] ' : ''}construyendo…${C.reset}`);
  const res = await api('/flow-agent/build', {
    body: { graph, message, mode: flags.expert ? 'expert' : 'fast', context: { flowName } },
  });

  log(`\n${C.green}💬 ${res.reply}${C.reset}\n`);
  printGraph(res.graph);
  if (res.problems?.length) log(`\n${C.yellow}⚠ Avisos:\n  - ${res.problems.join('\n  - ')}${C.reset}`);

  if (flags.save) {
    if (!flowId) die('--save requiere --flow <id> o --new "<nombre>".');
    await api(`/flows/${flowId}`, { method: 'PATCH', body: { graph: res.graph } });
    log(`\n${C.green}💾 guardado en el flujo ${flowId}${C.reset}`);
  } else if (flowId) {
    log(`\n${C.dim}(no guardado; usa --save para persistir en ${flowId})${C.reset}`);
  }
}

async function cmdRubro(flags) {
  await ensureToken();
  const id = flags._[0];
  if (!id) die('Indica el rubro. Lista: node wabots-flow.mjs templates');
  const tpls = await api('/flow-agent/templates', { body: {} });
  const tpl = tpls.find((t) => t.id === id);
  if (!tpl) die(`Rubro "${id}" no existe. Lista: node wabots-flow.mjs templates`);
  log(`${C.bold}${tpl.emoji} ${tpl.name}${C.reset}`);
  await runBuild(tpl.seed, flags);
}

function help() {
  log(`${C.bold}wabots-flow${C.reset} — constructor de flujos por IA

${C.bold}Comandos:${C.reset}
  build "<instrucción>" [--flow <id>] [--new "<nombre>" [--tenant <id>]] [--expert] [--save]
  rubro <id> [--flow <id>] [--new "<nombre>"] [--expert] [--save]
  flows
  templates

${C.bold}Config (env):${C.reset} WABOTS_URL, WABOTS_USER, WABOTS_PASS  (o WABOTS_TOKEN)

${C.bold}Ejemplos:${C.reset}
  node wabots-flow.mjs templates
  node wabots-flow.mjs build "bot de citas para barbería" --new "Barbería X" --save
  node wabots-flow.mjs build "agrega 'hablar con humano' al menú" --flow abc123 --save
  node wabots-flow.mjs rubro clinica --new "Clínica Sur" --expert --save`);
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const flags = parseFlags(rest);
  try {
    if (cmd === 'build') {
      const message = flags._.join(' ').trim();
      if (!message) die('Falta la instrucción. Ej: build "bot de citas para barbería"');
      await runBuild(message, flags);
    } else if (cmd === 'rubro') await cmdRubro(flags);
    else if (cmd === 'flows') await cmdFlows();
    else if (cmd === 'templates') await cmdTemplates();
    else help();
  } catch (e) {
    die(e.message || String(e));
  }
}

main();
