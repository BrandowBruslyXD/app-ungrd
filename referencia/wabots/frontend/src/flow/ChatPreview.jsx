// Probador visual de chat (estilo WhatsApp) SIEMPRE visible en el editor.
// Se auto-inicia (muestra la primera pantalla del bot sin que escribas nada) y
// refleja la estructura del flujo que estás armando. Simula el GRAFO ACTUAL
// (sin guardar) vía POST /flows/simulate-graph. Soporta enviar NOTAS DE VOZ
// (micrófono) e IMÁGENES para probar la transcripción y el OCR reales.
import { useEffect, useRef, useState } from 'react';
import api from '../lib/api';
import AudioPlayer from './AudioPlayer';

// Adjuntos aceptados: CUALQUIER imagen y CUALQUIER audio (el motor decodifica
// con ffmpeg/tesseract). PDF/Word/video NO se procesan: en producción el bot
// pide el dato por texto.
const MAX_MEDIA_MB = 8;
const ACCEPT_ATTR = 'image/*,audio/*';
const FORMATS_INFO =
  `Se acepta cualquier imagen o audio, máximo ${MAX_MEDIA_MB} MB. ` +
  'Los PDF/documentos y videos no se procesan: el bot pedirá el dato por texto.';

/** Blob/File → base64 sin el prefijo dataURL. */
function toBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** id estable para las claves de React de cada burbuja. */
function makeMsgId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Construye un mensaje con id estable (toda burbuja lleva id). */
function mkMsg(props) {
  return { id: makeMsgId(), ...props };
}

export default function ChatPreview({ getGraph, onClose, onTrace, graphKey, tenantId, flowId }) {
  const [messages, setMessages] = useState([]); // {id, from, text, options, menuType, media:{kind,label,url}}
  const [input, setInput] = useState('');
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [ended, setEnded] = useState(false);
  // Estado del micrófono/adjuntos.
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [processing, setProcessing] = useState(null); // 'audio' | 'image' | null
  const endRef = useRef(null);
  const fileRef = useRef(null);
  const recorderRef = useRef(null);
  const recTimerRef = useRef(null);
  const recSecondsRef = useRef(0); // duración actual sin depender del ciclo de render
  // Registro de objectURLs vivos (blobs de adjuntos) para revocarlos siempre
  // que dejen de usarse: al verificar la copia del servidor, al reiniciar la
  // conversación y al desmontar. Evita fugas de memoria (patrón MediaSection).
  const objectUrlsRef = useRef(new Set());

  // Crea un objectURL y lo registra para su posterior revocación.
  const createTrackedUrl = (blob) => {
    const url = URL.createObjectURL(blob);
    objectUrlsRef.current.add(url);
    return url;
  };

  // Revoca un objectURL registrado (idempotente: solo si sigue vivo).
  const revokeTrackedUrl = (url) => {
    if (url && objectUrlsRef.current.has(url)) {
      URL.revokeObjectURL(url);
      objectUrlsRef.current.delete(url);
    }
  };

  // Revoca TODOS los objectURLs vivos (reinicio o desmontaje).
  const revokeAllTrackedUrls = () => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current.clear();
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Limpieza al desmontar: revoca todos los objectURLs pendientes.
  useEffect(() => {
    return () => revokeAllTrackedUrls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Limpieza al desmontar: detiene grabación y libera el micrófono.
  useEffect(() => {
    return () => {
      clearInterval(recTimerRef.current);
      const rec = recorderRef.current;
      if (rec && rec.state !== 'inactive') {
        rec.onstop = null;
        rec.stop();
        rec.stream?.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Auto-inicio: muestra la primera pantalla del bot. Se re-ejecuta (debounced)
  // cuando cambia la estructura del flujo, para reflejar lo que vas armando.
  useEffect(() => {
    const t = setTimeout(() => {
      init();
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphKey]);

  // POST al simulador y devuelve el payload normalizado (helper común de
  // init/send/sendMedia; evita repetir la ruta post→parse).
  const postSim = async (body) => {
    const res = await api.post('/flows/simulate-graph', body);
    return res.data?.data ?? res.data;
  };

  // Mapea `outgoing` a burbujas del bot y actualiza estado/ended/onTrace.
  // append=false reemplaza la conversación (caso init).
  const applyResult = (d, { append = true } = {}) => {
    const outs = (d.outgoing || []).map((o) =>
      mkMsg({ from: 'bot', text: o.text, options: o.options, menuType: o.menuType, via: o.via }),
    );
    setMessages((m) => (append ? [...m, ...outs] : outs));
    setState({ variables: d.variables || {}, currentNodeId: d.currentNodeId });
    setEnded(!!d.ended);
    // onTrace(nodosVisitados, nodoActual): resalta el camino en el lienzo.
    onTrace?.(d.trace || [], d.currentNodeId);
  };

  // Arranca la conversación desde el principio (sin burbuja del usuario).
  const init = async () => {
    // Reinicio total: los adjuntos anteriores dejan de mostrarse, así que sus
    // objectURLs se revocan para no dejar blobs huérfanos en memoria.
    revokeAllTrackedUrls();
    const graph = getGraph?.();
    if (!graph || !Array.isArray(graph.nodes) || graph.nodes.length === 0) {
      setMessages([mkMsg({ from: 'bot', text: '➕ Agrega nodos al flujo para ver la vista previa.' })]);
      onTrace?.([], null);
      return;
    }
    setBusy(true);
    try {
      // tenantId: la empresa dueña del flujo, para medir el consumo de la prueba.
      const d = await postSim({
        graph,
        message: 'hola',
        ...(tenantId ? { tenantId } : {}),
      });
      applyResult(d, { append: false });
    } catch {
      setMessages([
        mkMsg({
          from: 'bot',
          text: '⚠️ No pude iniciar la vista previa. Revisa que haya un nodo Disparador conectado.',
        }),
      ]);
    } finally {
      setBusy(false);
    }
  };

  const send = async (text) => {
    const t = (text ?? '').trim();
    if (!t || busy) return;
    setMessages((m) => [...m, mkMsg({ from: 'user', text: t })]);
    setInput('');
    setBusy(true);
    try {
      const body = { graph: getGraph?.(), message: t };
      if (state) body.state = state;
      if (tenantId) body.tenantId = tenantId;
      applyResult(await postSim(body));
    } catch {
      setMessages((m) => [
        ...m,
        mkMsg({ from: 'bot', text: '⚠️ Error al simular. Revisa que el flujo esté bien conectado.' }),
      ]);
    } finally {
      setBusy(false);
    }
  };

  // Envía un adjunto (nota de voz o imagen) para probar transcripción/OCR reales.
  const sendMedia = async (kind, blob, label) => {
    if (busy) return;
    const sizeMb = blob.size / (1024 * 1024);
    if (sizeMb > MAX_MEDIA_MB) {
      setMessages((m) => [...m, mkMsg({ from: 'bot', text: `⚠️ El archivo pesa ${sizeMb.toFixed(1)} MB. ${FORMATS_INFO}` })]);
      return;
    }
    // Reproducción inmediata desde el blob local; al confirmar el servidor se
    // cambia a SU copia guardada (valida el envío de punta a punta).
    const userMsg = mkMsg({ from: 'user', text: '', media: { kind, label, url: createTrackedUrl(blob) } });
    setMessages((m) => [...m, userMsg]);
    setBusy(true);
    setProcessing(kind);
    try {
      const base64 = await toBase64(blob);
      const body = {
        graph: getGraph?.(),
        message: '',
        media: { base64, mimeType: (blob.type || '').split(';')[0], kind },
      };
      if (state) body.state = state;
      if (tenantId) body.tenantId = tenantId;
      if (flowId) body.flowId = flowId;
      const d = await postSim(body);
      applyResult(d);
      // Copia auditable del servidor: reproducir DESDE ella prueba que llegó bien.
      if (d.mediaFile) void verifyServerCopy(userMsg.id, d.mediaFile);
    } catch (err) {
      const apiMsg = err?.response?.data?.message;
      setMessages((m) => [...m, mkMsg({ from: 'bot', text: `⚠️ ${apiMsg || 'No se pudo procesar el adjunto.'}` })]);
    } finally {
      setBusy(false);
      setProcessing(null);
    }
  };

  // Descarga la copia guardada en el servidor y reemplaza la fuente del
  // reproductor: lo que suena es EXACTAMENTE lo que el backend recibió.
  const verifyServerCopy = async (msgId, fileName) => {
    try {
      const res = await api.get('/admin/preview-media/item', {
        params: { path: fileName },
        responseType: 'blob',
      });
      const serverUrl = createTrackedUrl(res.data);
      setMessages((m) =>
        m.map((msg) => {
          if (msg.id !== msgId) return msg;
          // Revoca el blob local anterior: la burbuja pasa a usar la copia
          // del servidor y el URL viejo quedaría huérfano.
          revokeTrackedUrl(msg.media?.url);
          return { ...msg, media: { ...msg.media, url: serverUrl, verified: true, file: fileName } };
        }),
      );
    } catch {
      /* si falla, el reproductor sigue con el blob local */
    }
  };

  // Selección de archivo: valida formato ANTES de enviar e informa lo aceptado.
  const onPickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const mime = (file.type || '').split(';')[0].toLowerCase();
    const kind = mime.startsWith('image/') ? 'image' : mime.startsWith('audio/') ? 'audio' : null;
    if (!kind) {
      setMessages((m) => [...m, mkMsg({ from: 'bot', text: `⚠️ "${file.name}" no es un formato soportado. ${FORMATS_INFO}` })]);
      return;
    }
    await sendMedia(kind, file, kind === 'image' ? `🖼️ ${file.name}` : `🎵 ${file.name}`);
  };

  // Micrófono: pulsar para grabar, pulsar de nuevo para enviar la nota de voz.
  const toggleRecording = async () => {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    if (busy) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(
        (t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t),
      );
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks = [];
      rec.ondataavailable = (ev) => { if (ev.data?.size) chunks.push(ev.data); };
      rec.onstop = () => {
        clearInterval(recTimerRef.current);
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
        const secs = recSecondsRef.current;
        setRecSeconds(0);
        // Notas demasiado cortas (clic accidental) no se envían.
        if (blob.size < 1024 || secs < 1) return;
        void sendMedia('audio', blob, `🎤 Nota de voz (${secs}s)`);
      };
      recorderRef.current = rec;
      recSecondsRef.current = 0;
      setRecSeconds(0);
      setRecording(true);
      recTimerRef.current = setInterval(() => {
        recSecondsRef.current += 1;
        setRecSeconds(recSecondsRef.current);
      }, 1000);
      rec.start();
    } catch (err) {
      // Mensaje específico según la causa real (permiso, hardware, política).
      const name = err?.name || '';
      const text =
        name === 'NotAllowedError' || name === 'SecurityError'
          ? '⚠️ El navegador bloqueó el micrófono. Haz clic en el candado de la barra de direcciones → Permisos → permite el Micrófono y recarga.'
          : name === 'NotFoundError' || name === 'OverconstrainedError'
            ? '⚠️ No se detectó ningún micrófono en este equipo.'
            : `⚠️ No se pudo iniciar la grabación (${name || 'error desconocido'}).`;
      setMessages((m) => [...m, mkMsg({ from: 'bot', text })]);
    }
  };

  return (
    <div className="flex h-full w-full min-h-0 flex-col bg-white">
      {/* Cabecera estilo WhatsApp */}
      <div className="flex items-center justify-between bg-[#075E54] px-3 py-2 text-white">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-white/20">🤖</span>
          <div>
            <div className="text-sm font-semibold leading-tight">Vista previa del chat</div>
            <div className="text-[10px] opacity-80">{busy ? 'Actualizando…' : 'En vivo'}</div>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={init}
            title="Reiniciar / reflejar cambios"
            className="grid h-9 w-9 place-items-center rounded-lg text-sm hover:bg-white/20"
          >
            ↻
          </button>
          {onClose && (
            <button
              onClick={onClose}
              title="Ocultar"
              className="grid h-9 w-9 place-items-center rounded-lg text-sm hover:bg-white/20"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 space-y-2 overflow-y-auto p-3" style={{ background: '#efeae2' }}>
        {messages.map((m) => (
          <div key={m.id} className={m.from === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm shadow-sm ${
                m.from === 'user' ? 'bg-[#d9fdd3] text-slate-900' : 'bg-white text-slate-900'
              }`}
            >
              {/* Adjunto del usuario: reproductor de audio o miniatura de imagen. */}
              {m.media && (
                <div className="mb-0.5">
                  {m.media.kind === 'audio' ? (
                    <AudioPlayer src={m.media.url} verified={m.media.verified} />
                  ) : m.media.url ? (
                    <img src={m.media.url} alt={m.media.label} className="max-h-40 rounded-md" />
                  ) : null}
                  <div className="mt-0.5 text-xs text-slate-600">
                    {m.media.label}
                    {m.media.kind === 'image' && m.media.verified ? ' · ✓ recibido' : ''}
                  </div>
                </div>
              )}
              {m.text}
              {/* Menú: botones o lista clicables */}
              {Array.isArray(m.options) && m.options.length > 0 && (
                <div className={`mt-2 flex gap-1 ${m.menuType === 'list' ? 'flex-col' : 'flex-wrap'}`}>
                  {m.options.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => send(o.label)}
                      disabled={busy}
                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-[#027eb5] hover:bg-slate-50 disabled:opacity-50"
                    >
                      {m.menuType === 'list' ? `▸ ${o.label}` : o.label}
                    </button>
                  ))}
                </div>
              )}
              {/* Doble seguro: qué LLM generó esta respuesta. */}
              {m.via && (
                <div
                  className={`mt-1 text-[10px] font-medium ${
                    m.via === 'web'
                      ? 'text-emerald-600'
                      : m.via === 'fallback'
                        ? 'text-amber-600'
                        : 'text-slate-400'
                  }`}
                >
                  {m.via === 'web'
                    ? '🟢 Sesión DeepSeek'
                    : m.via === 'fallback'
                      ? '⚠️ API key (fallback)'
                      : '🔑 API key'}
                </div>
              )}
            </div>
          </div>
        ))}
        {processing && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-white px-3 py-2 text-xs italic text-slate-500 shadow-sm">
              {processing === 'audio' ? '🎤 Transcribiendo el audio…' : '🖼️ Leyendo la imagen (OCR)…'} puede tardar unos segundos.
            </div>
          </div>
        )}
        {ended && (
          <p className="pt-1 text-center text-[10px] text-slate-500">— conversación finalizada —</p>
        )}
        <div ref={endRef} />
      </div>

      {/* Entrada: texto + adjunto + micrófono (para probar OCR y transcripción). */}
      <div className="flex items-center gap-1.5 border-t border-slate-200/80 bg-[#f0f2f5] p-2">
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT_ATTR}
          className="hidden"
          onChange={onPickFile}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy || recording}
          title={FORMATS_INFO}
          aria-label="Adjuntar imagen o audio"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-lg text-slate-600 hover:bg-slate-200 disabled:opacity-40"
        >
          📎
        </button>
        {recording ? (
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
            <span className="text-slate-700">Grabando… {recSeconds}s</span>
            <span className="ml-auto text-[11px] text-slate-400">pulsa 🎙️ para enviar</span>
          </div>
        ) : (
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') send(input);
            }}
            placeholder="Escribe como un cliente…"
            className="input flex-1"
          />
        )}
        <button
          onClick={toggleRecording}
          disabled={busy && !recording}
          title="Grabar nota de voz (prueba la transcripción)"
          aria-label={recording ? 'Detener y enviar la nota de voz' : 'Grabar nota de voz'}
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-lg disabled:opacity-40 ${
            recording ? 'bg-red-500 text-white hover:bg-red-600' : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          🎙️
        </button>
        {!recording && (
          <button className="btn-primary px-3" onClick={() => send(input)} disabled={busy}>
            ➤
          </button>
        )}
      </div>
    </div>
  );
}
