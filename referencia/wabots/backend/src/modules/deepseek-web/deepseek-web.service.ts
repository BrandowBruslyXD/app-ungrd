import { Injectable, Logger } from '@nestjs/common';

import {
  PowChallenge,
  buildPowHeader,
  solvePow,
} from './deepseek-pow';

const ORIGIN = 'https://chat.deepseek.com';
const COMPLETION_PATH = '/api/v0/chat/completion';
const REQUEST_TIMEOUT_MS = 60_000;

/** Credenciales de una sesión web de DeepSeek. Llegan por parámetro. */
export interface DeepseekWebCred {
  bearer: string;
  cookieHeader?: string | null;
}

/** Parámetros de un envío instantáneo (sin thinking). */
export interface SendInstantParams {
  chatSessionId: string;
  parentMessageId?: number | null;
  prompt: string;
}

/** Resultado de un envío instantáneo. */
export interface SendInstantResult {
  text: string;
  responseMessageId: number | null;
  chatSessionId: string;
}

/**
 * Cliente HTTP puro (sin Playwright, sin navegador) para la sesión web de
 * chat.deepseek.com. Usa `fetch` global de Node 20+.
 *
 * Es CONSUMER-AGNÓSTICO: no sabe de tenants ni flows. Recibe un `cred` (bearer
 * + cookie opcional) + chatSession + prompt y habla con DeepSeek. Solo modo
 * INSTANTÁNEO sin thinking: acumula el texto RESPONSE del stream SSE, ignora
 * los fragmentos THINK, y captura el response_message_id.
 */
@Injectable()
export class DeepseekWebService {
  private readonly logger = new Logger(DeepseekWebService.name);

  /** Headers base de la sesión web (x-client-*, Authorization, Cookie). */
  private baseHeaders(cred: DeepseekWebCred): Record<string, string> {
    const h: Record<string, string> = {
      Authorization: `Bearer ${cred.bearer}`,
      'Content-Type': 'application/json',
      Accept: '*/*',
      'x-app-version': '2.0.0',
      'x-client-version': '2.0.0',
      'x-client-platform': 'web',
      'x-client-locale': 'en_US',
      'x-client-timezone-offset': '-18000',
    };
    if (cred.cookieHeader) h.Cookie = cred.cookieHeader;
    return h;
  }

  /**
   * ¿La respuesta indica que la sesión web está vencida/rota? Un bearer
   * expirado llega como HTTP 401/403, code 40003/40001, o una página HTML de
   * Cloudflare (gate anti-bot).
   */
  private looksAuthStale(status: number, text: string, parsed: any): boolean {
    if (status === 401 || status === 403) return true;
    if (parsed && (parsed.code === 40003 || parsed.code === 40001)) return true;
    if (!parsed && /^\s*</.test(text || '') &&
      /(just a moment|challenge-platform|cf-chl|__cf|<!doctype html)/i.test(text || '')) {
      return true;
    }
    return false;
  }

  /** ¿La respuesta es un rechazo del POW (code 40301 / INVALID_POW)? */
  private isPowRejection(j: any): boolean {
    if (!j) return false;
    if (j.code === 40301) return true;
    const m = `${j.msg || ''} ${j?.data?.biz_msg || ''}`;
    return /invalid[_ ]?pow|pow[_ ]?response/i.test(m);
  }

  /** fetch con timeout (AbortController). */
  private async fetchWithTimeout(url: string, init: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      return await fetch(url, { ...init, signal: ctrl.signal });
    } finally {
      clearTimeout(t);
    }
  }

  /**
   * Crea una nueva sesión de chat. POST /api/v0/chat_session/create con body
   * `{}`. Devuelve el chat_session.id. Lanza en error.
   */
  async createSession(cred: DeepseekWebCred): Promise<string> {
    const r = await this.fetchWithTimeout(`${ORIGIN}/api/v0/chat_session/create`, {
      method: 'POST',
      headers: this.baseHeaders(cred),
      body: JSON.stringify({}),
    });
    const text = await r.text();
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch {}
    if (this.looksAuthStale(r.status, text, parsed)) {
      throw new Error('Sesión de DeepSeek expirada. Revincula la cuenta.');
    }
    if (r.status !== 200 || parsed?.code !== 0) {
      throw new Error(`create_session ${r.status}: ${text.slice(0, 200)}`);
    }
    const id = parsed.data?.biz_data?.chat_session?.id || parsed.data?.biz_data?.id;
    if (!id) throw new Error('create_session sin id: ' + text.slice(0, 200));
    return id;
  }

  /**
   * Pide un challenge de POW, lo resuelve (single-thread) y devuelve el header
   * `x-ds-pow-response` ya construido (base64).
   */
  async getPowHeader(cred: DeepseekWebCred, targetPath: string = COMPLETION_PATH): Promise<string> {
    const r = await this.fetchWithTimeout(`${ORIGIN}/api/v0/chat/create_pow_challenge`, {
      method: 'POST',
      headers: this.baseHeaders(cred),
      body: JSON.stringify({ target_path: targetPath }),
    });
    const text = await r.text();
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch {}
    if (this.looksAuthStale(r.status, text, parsed)) {
      throw new Error('Sesión de DeepSeek expirada. Revincula la cuenta.');
    }
    if (r.status !== 200 || parsed?.code !== 0) {
      throw new Error(`create_pow_challenge ${r.status}: ${text.slice(0, 200)}`);
    }
    const ch: PowChallenge = parsed.data.biz_data.challenge;
    const ans = solvePow({
      challenge: ch.challenge,
      salt: ch.salt,
      expireAt: ch.expire_at,
      difficulty: ch.difficulty,
    });
    if (ans < 0) throw new Error('POW: no solution within difficulty');
    return buildPowHeader(ch, ans);
  }

  /**
   * Envío INSTANTÁNEO (sin thinking). Resuelve el POW, hace POST al
   * /api/v0/chat/completion, lee el stream SSE y ACUMULA solo el texto de los
   * fragmentos RESPONSE (ignora THINK). Captura el response_message_id (del
   * evento `ready` y del snapshot `v.response.message_id`).
   *
   * Lanza errores claros ante: sesión vencida, POW rechazado, JSON inesperado
   * o respuesta final vacía.
   */
  async sendInstant(cred: DeepseekWebCred, params: SendInstantParams): Promise<SendInstantResult> {
    const { chatSessionId, prompt } = params;
    const parentMessageId = params.parentMessageId ?? null;
    if (typeof prompt !== 'string' || !prompt.trim()) throw new Error('prompt requerido');
    if (!chatSessionId) throw new Error('chatSessionId requerido');

    const pow = await this.getPowHeader(cred, COMPLETION_PATH);

    const r = await this.fetchWithTimeout(`${ORIGIN}${COMPLETION_PATH}`, {
      method: 'POST',
      headers: {
        ...this.baseHeaders(cred),
        Accept: 'text/event-stream',
        'x-ds-pow-response': pow,
      },
      body: JSON.stringify({
        chat_session_id: chatSessionId,
        parent_message_id: parentMessageId,
        model_type: null,
        prompt,
        ref_file_ids: [],
        thinking_enabled: false,
        search_enabled: false,
        action: null,
        preempt: false,
      }),
    });

    // Errores fuera de banda ANTES de leer el stream.
    if (r.status !== 200) {
      const t = await r.text().catch(() => '');
      let j: any = null;
      try { j = JSON.parse(t); } catch {}
      if (this.looksAuthStale(r.status, t, j)) {
        throw new Error('Sesión de DeepSeek expirada. Revincula la cuenta.');
      }
      if (this.isPowRejection(j)) {
        throw new Error('POW rechazado por DeepSeek (INVALID_POW). Reintenta.');
      }
      throw new Error(`completion HTTP ${r.status}: ${t.slice(0, 200)}`);
    }

    // La completion DEBE responder text/event-stream. Si responde JSON es
    // SIEMPRE una señal fuera de banda (sesión vencida con HTTP 200, POW
    // rechazado, error de negocio). Interceptar ANTES del parser SSE.
    const ct = r.headers.get('content-type') || '';
    if (/application\/json/.test(ct)) {
      const t = await r.text().catch(() => '');
      let j: any = null;
      try { j = JSON.parse(t); } catch {}
      if (this.looksAuthStale(r.status, t, j)) {
        throw new Error('Sesión de DeepSeek expirada. Revincula la cuenta.');
      }
      if (this.isPowRejection(j)) {
        throw new Error('POW rechazado por DeepSeek (INVALID_POW). Reintenta.');
      }
      throw new Error(
        `completion devolvió JSON inesperado${j?.data?.biz_code != null ? ` (biz_code ${j.data.biz_code})` : ''}: ` +
        `${(j?.data?.biz_msg || t).slice(0, 200)}`,
      );
    }

    if (!r.body) throw new Error('completion sin cuerpo de stream');

    const { text, responseMessageId, status } = await this.parseInstantStream(r.body);

    // SOLO damos por buena la respuesta si DeepSeek la marcó FINISHED. Un stream
    // cortado/interrumpido (sin FINISHED) o con otro estado NO se envía: se lanza
    // para que el runner caiga al fallback de API key. Así el usuario nunca ve
    // una respuesta truncada del modo web.
    if (!text.trim()) throw new Error('respuesta vacía');
    if (status !== 'FINISHED') {
      throw new Error(`respuesta incompleta (status ${status ?? 'sin FINISHED'})`);
    }

    return { text, responseMessageId, chatSessionId };
  }

  /**
   * Parser del stream SSE en modo instantáneo (thinking off). Acumula solo el
   * texto de los fragmentos RESPONSE y captura el response_message_id.
   */
  private async parseInstantStream(
    body: ReadableStream<Uint8Array>,
  ): Promise<{ text: string; responseMessageId: number | null; status: string | null }> {
    const reader = body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    let content = '';
    let responseMessageId: number | null = null;
    // Estado terminal de la respuesta (DeepSeek envía "FINISHED" al completar).
    // Si el stream termina sin FINISHED, la respuesta quedó incompleta.
    let status: string | null = null;
    let snapshotEmitted = false;
    let currentPath: string | null = null;
    let currentOp: string | null = null;
    let pendingEvent: string | null = null;

    // Mapa idx -> tipo de fragmento ('RESPONSE' | 'THINK'). Con thinking off
    // esperamos solo RESPONSE, pero mantenemos el ruteo para ignorar THINK.
    const fragsType = new Map<number, string>();
    // Tipo ensanchado a `string` a propósito: el ruteo puede conmutar phase a
    // 'THINK'/'RESPONSE' según las señales del SSE, y no queremos que TS lo
    // reduzca a un literal (rompería las comparaciones === 'THINK').
    let phase: string = 'RESPONSE';
    let lastObservedFragIdx = -1;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let idx: number;
      while ((idx = buf.indexOf('\n\n')) !== -1) {
        const chunk = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        for (const line of chunk.split('\n')) {
          if (line.startsWith('event:')) { pendingEvent = line.slice(6).trim(); continue; }
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (!payload) { pendingEvent = null; continue; }
          let o: any;
          try { o = JSON.parse(payload); } catch { pendingEvent = null; continue; }

          // response_message_id: llega en el evento 'ready' y en el snapshot.
          if (typeof o.response_message_id === 'number') responseMessageId = o.response_message_id;
          if (o.v && typeof o.v === 'object' && o.v.response && typeof o.v.response.message_id === 'number') {
            responseMessageId = o.v.response.message_id;
          }
          pendingEvent = null;

          // Snapshot inicial: solo procesar una vez.
          if (o.v && typeof o.v === 'object' && o.v.response) {
            if (!snapshotEmitted) {
              snapshotEmitted = true;
              const resp = o.v.response;
              const frags = Array.isArray(resp.fragments) ? resp.fragments : [];
              if (frags.length > 0) {
                for (let i = 0; i < frags.length; i++) {
                  const f = frags[i];
                  if (!f) continue;
                  if (f.type) {
                    fragsType.set(i, f.type);
                    if (i > lastObservedFragIdx) lastObservedFragIdx = i;
                    if (f.type === 'RESPONSE') phase = 'RESPONSE';
                  }
                  if (f.type === 'RESPONSE' && typeof f.content === 'string' && f.content) {
                    content += f.content;
                  }
                }
              } else if (typeof resp.content === 'string' && resp.content) {
                content = resp.content;
              }
              if (typeof resp.status === 'string') status = resp.status;
            }
            continue;
          }

          if (typeof o.p === 'string') { currentPath = o.p; currentOp = o.o || null; }

          // (a) Nuevo fragmento con path "response/fragments/N".
          const fragCreateMatch = currentPath ? currentPath.match(/^response\/fragments\/(-?\d+)$/) : null;
          if (fragCreateMatch && o.v && typeof o.v === 'object' && o.v.type) {
            let fi = parseInt(fragCreateMatch[1], 10);
            if (fi === -1) fi = lastObservedFragIdx + 1;
            fragsType.set(fi, o.v.type);
            if (fi > lastObservedFragIdx) lastObservedFragIdx = fi;
            if (o.v.type === 'RESPONSE') phase = 'RESPONSE';
            if (typeof o.v.content === 'string' && o.v.content && o.v.type === 'RESPONSE') {
              content += o.v.content;
            }
            continue;
          }

          // (b) Path "response/fragments" con APPEND/SET (array de fragmentos).
          if (currentPath === 'response/fragments') {
            const list = Array.isArray(o.v) ? o.v : (o.v && typeof o.v === 'object' && o.v.type ? [o.v] : null);
            if (list) {
              for (const f of list) {
                if (!f || !f.type) continue;
                const fi = lastObservedFragIdx + 1;
                fragsType.set(fi, f.type);
                lastObservedFragIdx = fi;
                if (f.type === 'RESPONSE') phase = 'RESPONSE';
                if (typeof f.content === 'string' && f.content && f.type === 'RESPONSE') {
                  content += f.content;
                }
              }
              continue;
            }
          }

          // === Deltas a paths "content-like" ===
          const fragMatch = currentPath ? currentPath.match(/^response\/fragments\/(-?\d+)\/content$/) : null;
          const fragIdx = fragMatch ? parseInt(fragMatch[1], 10) : null;
          const isLegacyContentPath = currentPath === 'response/content';
          const isLegacyThinkPath = currentPath === 'response/thinking_content';
          const isFragThinkPath = currentPath
            ? /^response\/fragments\/-?\d+\/(thinking_content|think_content)$/.test(currentPath)
            : false;

          let channel: 'content' | 'thinking' | null = null;
          if (isLegacyThinkPath || isFragThinkPath) channel = 'thinking';
          else if (isLegacyContentPath) { channel = 'content'; phase = 'RESPONSE'; }
          else if (fragMatch) {
            if (fragIdx !== null && fragIdx >= 0) {
              if (!fragsType.has(fragIdx)) {
                if (fragIdx > lastObservedFragIdx && phase === 'THINK') {
                  fragsType.set(fragIdx, 'RESPONSE');
                  phase = 'RESPONSE';
                }
              }
              if (fragIdx > lastObservedFragIdx) lastObservedFragIdx = fragIdx;
            }
            let known: string | undefined;
            if (fragIdx === -1) known = fragsType.get(lastObservedFragIdx);
            else if (fragIdx !== null) known = fragsType.get(fragIdx);
            if (!known) known = phase === 'THINK' ? 'THINK' : 'RESPONSE';
            channel = known === 'THINK' ? 'thinking' : 'content';
            if (channel === 'content') phase = 'RESPONSE';
          }

          // Solo acumulamos el canal RESPONSE (thinking off → ignoramos THINK).
          if (channel === 'content' && typeof o.v === 'string') {
            if (currentOp === 'SET') content = o.v;
            else content += o.v;
          } else if (currentPath === 'response/status' && typeof o.v === 'string') {
            // Estado terminal (FINISHED / u otro). Es la señal de completitud.
            status = o.v;
          }
        }
      }
    }

    return { text: content, responseMessageId, status };
  }
}
