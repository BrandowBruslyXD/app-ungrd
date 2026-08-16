// Daemon de SESIÓN DeepSeek-web. Corre SIEMPRE en el servidor, SEPARADO de
// wabots (sus redeploys no lo tocan). TODO ocurre en el servidor:
//   - login  : navegador REAL (xvfb) con credenciales de .env.server → deja el
//              perfil logueado y escribe el token cifrado en la BD.
//   - refresh: cada ~20 min lee el token del perfil (localStorage) + lo valida/
//              renueva por HTTP (users/current) y lo escribe cifrado en la BD.
//   - logout : cierra la sesión en DeepSeek (users/logout) y saca la cuenta del pool.
// wabots solo LEE de la tabla `deepseek_accounts`.
//
// CloudFront/WAF bloquea la CARGA de la web headless desde la IP del datacenter,
// pero la API /api/v0 SÍ responde con el bearer; y el login con navegador REAL
// (xvfb) resuelve el token del WAF en el propio servidor.
//
// Modos:
//   node index.mjs                 → daemon de refresco (loop). Modo servidor.
//   xvfb-run -a node index.mjs login  [label]  → login headed con credenciales del env.
//   node index.mjs logout [label]  → cierra sesión y saca la cuenta del pool.
//
// Env: DATABASE_URL, ENCRYPTION_KEY, DS_PROFILES_DIR (=/profiles),
//      DS_REFRESH_INTERVAL_MS (20min), DS_MAX_FAILS (3),
//      DS_LOGIN_EMAIL, DS_LOGIN_PASSWORD, DS_LABEL (label por defecto).
import { spawn } from 'child_process';
import crypto from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import http from 'http';
import { join } from 'path';
import pg from 'pg';
import { chromium } from 'playwright';

let loginActive = false; // hay un login interactivo (VNC) en curso

const ORIGIN = 'https://chat.deepseek.com';
const PROFILES_DIR = process.env.DS_PROFILES_DIR || '/profiles';
const INTERVAL_MS = Number(process.env.DS_REFRESH_INTERVAL_MS || 20 * 60 * 1000);
const MAX_FAILS = Number(process.env.DS_MAX_FAILS || 3);
const KEY_HEX = process.env.ENCRYPTION_KEY || '';
const DEFAULT_LABEL = process.env.DS_LABEL || 'lldikayll';

if (!/^[0-9a-fA-F]{64}$/.test(KEY_HEX)) {
  console.error('[ds-daemon] ENCRYPTION_KEY inválida (64 hex). Abortando.');
  process.exit(1);
}
const KEY = Buffer.from(KEY_HEX, 'hex');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// Mismo formato que CryptoService de wabots: base64(iv[12]|tag[16]|ct).
function encrypt(plain) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const e = Buffer.concat([c.update(String(plain), 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), e]).toString('base64');
}

const API_HEADERS = (token, cookieHeader) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  Accept: '*/*',
  'x-app-version': '2.0.0',
  'x-client-version': '2.0.0',
  'x-client-platform': 'web',
  'x-client-locale': 'en_US',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  ...(cookieHeader ? { Cookie: cookieHeader } : {}),
});

const readTokenFromPage = (page) =>
  page
    .evaluate(() => {
      try {
        return JSON.parse(localStorage.getItem('userToken')).value;
      } catch {
        return null;
      }
    })
    .catch(() => null);

// ── DB helpers ────────────────────────────────────────────────────────────────
async function upsertAccount(label, bearer, cookieHeader) {
  const bearerEnc = encrypt(bearer);
  const cookieEnc = cookieHeader ? encrypt(cookieHeader) : null;
  const { rows } = await pool.query(`SELECT id FROM deepseek_accounts WHERE label=$1 LIMIT 1`, [label]);
  if (rows[0]) {
    await pool.query(
      `UPDATE deepseek_accounts SET "bearerEnc"=$1, "cookieEnc"=COALESCE($2,"cookieEnc"), status='active', "failCount"=0, "lastError"=NULL, "updatedAt"=now() WHERE id=$3`,
      [bearerEnc, cookieEnc, rows[0].id],
    );
    return rows[0].id;
  }
  const id = crypto.randomUUID();
  await pool.query(
    `INSERT INTO deepseek_accounts (id, label, status, "bearerEnc", "cookieEnc", "failCount", "createdAt", "updatedAt") VALUES ($1,$2,'active',$3,$4,0,now(),now())`,
    [id, label, bearerEnc, cookieEnc],
  );
  return id;
}

async function markFailure(id, failCount, message) {
  const next = (failCount || 0) + 1;
  const status = next >= MAX_FAILS ? 'failed' : 'active';
  await pool
    .query(`UPDATE deepseek_accounts SET "failCount"=$1, "lastError"=$2, status=$3, "updatedAt"=now() WHERE id=$4`, [
      next,
      String(message).slice(0, 300),
      status,
      id,
    ])
    .catch(() => {});
  return { next, status };
}

// ── refresh (loop del servidor) ────────────────────────────────────────────────
async function readProfileSession(label) {
  const profileDir = join(PROFILES_DIR, label);
  if (!existsSync(profileDir)) throw new Error(`sin perfil en ${profileDir} (haz login: node index.mjs login ${label})`);
  const ctx = await chromium.launchPersistentContext(profileDir, {
    headless: true,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
  });
  try {
    const page = await ctx.newPage();
    await page.goto(`${ORIGIN}/`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 2000));
    const token = await readTokenFromPage(page);
    let cookieHeader = null;
    try {
      const cookies = await ctx.cookies(ORIGIN);
      if (cookies?.length) cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
    } catch {}
    return { token, cookieHeader };
  } finally {
    await ctx.close().catch(() => {});
  }
}

async function validateSession(token, cookieHeader) {
  if (!token) throw new Error('sin token en el perfil (re-loguea: node index.mjs login <label>)');
  const r = await fetch(`${ORIGIN}/api/v0/users/current`, { headers: API_HEADERS(token, cookieHeader) });
  const txt = await r.text();
  if (r.status === 401 || r.status === 403) throw new Error(`token expirado/revocado (HTTP ${r.status})`);
  let j = null;
  try {
    j = JSON.parse(txt);
  } catch {
    throw new Error(`respuesta no-JSON de users/current (HTTP ${r.status})`);
  }
  if (j?.code !== 0) throw new Error(`users/current code=${j?.code} msg=${j?.msg || ''}`);
  return { token: j?.data?.biz_data?.token || token, cookieHeader };
}

async function targets() {
  const seen = new Set();
  const out = [];
  try {
    const { rows } = await pool.query(`SELECT id, label, "failCount" FROM deepseek_accounts WHERE status <> 'failed'`);
    for (const r of rows) {
      out.push(r);
      seen.add(r.label);
    }
  } catch (e) {
    console.error('[ds-daemon] no se pudo leer cuentas:', e?.message || e);
  }
  try {
    const { readdirSync } = await import('fs');
    for (const label of readdirSync(PROFILES_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)) {
      if (!seen.has(label)) out.push({ id: null, label, failCount: 0 });
    }
  } catch {}
  return out;
}

async function refreshAll() {
  if (loginActive) return; // no abrir el perfil mientras hay un login interactivo
  for (const acc of await targets()) {
    try {
      const s = await readProfileSession(acc.label);
      const v = await validateSession(s.token, s.cookieHeader);
      await upsertAccount(acc.label, v.token, v.cookieHeader);
      console.log(`[ds-daemon] ${acc.label}: bearer${v.cookieHeader ? '+cookies' : ''} refrescado ✓`);
    } catch (e) {
      if (acc.id) {
        const { next, status } = await markFailure(acc.id, acc.failCount, e?.message || e);
        console.warn(`[ds-daemon] ${acc.label}: fallo (${next}/${MAX_FAILS}) → ${status}: ${e?.message || e}`);
      } else {
        console.warn(`[ds-daemon] ${acc.label}: fallo (perfil sin fila): ${e?.message || e}`);
      }
    }
  }
}

// ── login INTERACTIVO en el servidor (vía VNC) ───────────────────────────────
// Abre el navegador REAL en el DISPLAY (Xvfb :99 que sirve el wrapper login.sh
// por VNC). El HUMANO se conecta por túnel SSH, pasa la verificación de DeepSeek
// ("Human Verification" / CAPTCHA — no la puede/ debe hacer el bot) y se loguea.
// El daemon solo ESPERA a que aparezca el token y lo escribe cifrado en la BD.
async function doLogin(label) {
  const profileDir = join(PROFILES_DIR, label);
  mkdirSync(profileDir, { recursive: true });
  const shot = join(PROFILES_DIR, `${label}_login.png`);
  const waitMs = Number(process.env.DS_LOGIN_WAIT_MS || 6 * 60 * 1000);
  const ctx = await chromium.launchPersistentContext(profileDir, {
    headless: false, // usa el DISPLAY (Xvfb) que expone login.sh por VNC
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
    viewport: { width: 1280, height: 900 },
  });
  try {
    const page = ctx.pages()[0] || (await ctx.newPage());
    await page.goto(`${ORIGIN}/sign_in`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    console.log(
      `[ds-daemon] login: navegador abierto para "${label}". Conéctate por VNC y completa el login+verificación. Esperando token (${Math.round(
        waitMs / 60000,
      )} min)…`,
    );
    let token = null;
    const t0 = Date.now();
    while (Date.now() - t0 < waitMs) {
      token = await readTokenFromPage(page);
      if (token) break;
      if (ctx.pages().length === 0) break;
      await new Promise((r) => setTimeout(r, 2000));
    }
    await page.screenshot({ path: shot }).catch(() => {});
    if (!token) throw new Error(`login sin token tras ${Math.round(waitMs / 60000)} min (¿se completó la verificación?)`);
    let cookieHeader = null;
    try {
      const cookies = await ctx.cookies(ORIGIN);
      if (cookies?.length) cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
    } catch {}
    const v = await validateSession(token, cookieHeader);
    await upsertAccount(label, v.token, v.cookieHeader);
    console.log(`[ds-daemon] login OK (${label}) → token escrito en la BD ✓`);
  } finally {
    await ctx.close().catch(() => {});
  }
}

// ── logout (server-side) ─────────────────────────────────────────────────────
async function doLogout(label) {
  const s = await readProfileSession(label).catch(() => ({ token: null, cookieHeader: null }));
  if (s.token) {
    await fetch(`${ORIGIN}/api/v0/users/logout`, { method: 'POST', headers: API_HEADERS(s.token, s.cookieHeader), body: '{}' }).catch(
      () => {},
    );
  }
  await pool
    .query(`UPDATE deepseek_accounts SET status='failed', "lastError"='logout manual', "updatedAt"=now() WHERE label=$1`, [label])
    .catch(() => {});
  console.log(`[ds-daemon] logout (${label}) → sesión cerrada y cuenta fuera del pool ✓`);
}

// ── servidor de control (lo consume el Dashboard de wabots vía backend) ──────
async function poolStatus() {
  const { rows } = await pool.query(
    `SELECT label, status, "failCount", "lastError", "lastUsedAt", "updatedAt" FROM deepseek_accounts ORDER BY "updatedAt" DESC`,
  );
  return rows;
}

function startControlServer() {
  const port = Number(process.env.DS_CTRL_PORT || 6180);
  const token = process.env.DS_CTRL_TOKEN || '';
  const srv = http.createServer(async (req, res) => {
    const send = (code, obj) => {
      res.writeHead(code, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(obj));
    };
    try {
      // Fail-closed: sin token configurado, no atiende nada.
      if (!token || req.headers['x-ctrl-token'] !== token) return send(403, { ok: false, error: 'forbidden' });
      const url = new URL(req.url, 'http://x');
      if (req.method === 'GET' && url.pathname === '/status') {
        return send(200, { ok: true, loginActive, vncPort: 5900, accounts: await poolStatus() });
      }
      if (req.method === 'POST') {
        let body = '';
        for await (const c of req) body += c;
        const j = body ? JSON.parse(body) : {};
        const label = String(j.label || DEFAULT_LABEL).replace(/[^a-zA-Z0-9_.-]/g, '') || DEFAULT_LABEL;
        if (url.pathname === '/login') {
          if (loginActive) return send(200, { ok: true, alreadyRunning: true, vncPort: 5900 });
          loginActive = true;
          const child = spawn('sh', ['/app/login.sh', label], { env: process.env });
          child.stdout.on('data', (d) => process.stdout.write(`[login] ${d}`));
          child.stderr.on('data', (d) => process.stderr.write(`[login] ${d}`));
          child.on('exit', (code) => {
            loginActive = false;
            console.log(`[ctrl] login.sh (${label}) terminó (code ${code})`);
          });
          return send(200, { ok: true, started: true, vncPort: 5900 });
        }
        if (url.pathname === '/logout') {
          await doLogout(label);
          return send(200, { ok: true });
        }
      }
      return send(404, { ok: false, error: 'not found' });
    } catch (e) {
      send(500, { ok: false, error: String(e?.message || e) });
    }
  });
  srv.listen(port, '0.0.0.0', () => console.log(`[ds-daemon] control API en :${port}`));
}

// ── dispatch ─────────────────────────────────────────────────────────────────
const mode = process.argv[2];
if (mode === 'login') {
  await doLogin(process.argv[3] || DEFAULT_LABEL);
  await pool.end().catch(() => {});
  process.exit(0);
} else if (mode === 'logout') {
  await doLogout(process.argv[3] || DEFAULT_LABEL);
  await pool.end().catch(() => {});
  process.exit(0);
} else {
  console.log(`[ds-daemon] arrancado. Refresca cada ${Math.round(INTERVAL_MS / 60000)} min desde ${PROFILES_DIR}.`);
  startControlServer();
  await refreshAll();
  setInterval(refreshAll, INTERVAL_MS);
}
