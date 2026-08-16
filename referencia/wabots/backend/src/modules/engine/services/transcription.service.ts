import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { spawn } from 'child_process';

import { cpuSemaphore } from '../../../common/concurrency/cpu-semaphore';

/**
 * Transcripción de audio a texto 100% OFFLINE y MULTILINGÜE con Whisper
 * (Transformers.js + ONNX Runtime). No usa ninguna API externa ni el LLM del chat.
 *
 * Pipeline:
 *   1) Recibe el audio entrante (OGG/Opus de WhatsApp u otro) como Buffer.
 *   2) Lo decodifica a PCM float32 16 kHz mono con el binario de `ffmpeg-static`
 *      (no requiere ffmpeg del sistema).
 *   3) Lo pasa por el modelo Whisper, que DETECTA EL IDIOMA automáticamente
 *      (~99 idiomas: español, inglés, francés, chino, etc.) y transcribe.
 *
 * El modelo se carga una sola vez (singleton de proceso, lazy). Se cachea en
 * TRANSFORMERS_CACHE (default /opt/models/transformers) y el id del modelo se
 * controla con WHISPER_MODEL (default Xenova/whisper-base, multilingüe).
 *
 * Notas:
 *  - @xenova/transformers es ESM; se importa con import() dinámico real (envuelto
 *    en Function para que TypeScript no lo degrade a require() bajo CommonJS).
 *  - ffmpeg-static se carga con require dinámico; solo se necesita al transcribir.
 */
@Injectable()
export class TranscriptionService implements OnModuleInit {
  private readonly logger = new Logger(TranscriptionService.name);

  private readonly modelId = process.env.WHISPER_MODEL || 'Xenova/whisper-base';
  /**
   * Idioma de transcripción (WHISPER_LANGUAGE). Default 'auto': el cliente
   * puede hablar en cualquier idioma y se transcribe TAL CUAL lo dijo (los
   * negocios atienden clientes dentro y fuera del país). El error de "salió en
   * inglés" no era de detección sino de TRADUCCIÓN: se corrige fijando
   * task 'transcribe' en la llamada (nunca 'translate'). Un valor concreto
   * ('es', 'en', ...) fija el idioma solo si un negocio lo requiere.
   */
  private readonly language = (process.env.WHISPER_LANGUAGE || 'auto').toLowerCase();
  private readonly sampleRate = 16000;

  /**
   * Precarga el modelo al arrancar (en segundo plano): la primera nota de voz
   * real no paga los segundos de carga del modelo.
   */
  onModuleInit(): void {
    void this.getTranscriber().catch((err) => {
      this.logger.warn(`Precarga de Whisper falló (se reintenta al usarse): ${err?.message ?? err}`);
    });
  }

  /** Pipeline Whisper cargado una sola vez (lazy). */
  private transcriber: any | null = null;
  private loading: Promise<any> | null = null;

  /** import() real (no convertible a require por TS) para paquetes ESM. */
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  private readonly dynamicImport = new Function('m', 'return import(m)') as (
    m: string,
  ) => Promise<any>;

  /** Carga (perezosa) el pipeline de reconocimiento de voz. Singleton por proceso. */
  private async getTranscriber(): Promise<any> {
    if (this.transcriber) return this.transcriber;
    if (this.loading) return this.loading;

    this.loading = (async () => {
      const { pipeline, env } = await this.dynamicImport('@xenova/transformers');
      // Caché persistente en el volumen wabots_models: el modelo se descarga en
      // el primer arranque (onModuleInit) y se reutiliza en los siguientes.
      env.cacheDir = process.env.TRANSFORMERS_CACHE || '/opt/models/transformers';
      env.allowRemoteModels = true;

      this.logger.log(`Cargando modelo Whisper "${this.modelId}" ...`);
      const t = await pipeline('automatic-speech-recognition', this.modelId);
      this.transcriber = t;
      this.logger.log('Modelo Whisper cargado.');
      return t;
    })();

    try {
      return await this.loading;
    } finally {
      this.loading = null;
    }
  }

  /**
   * Transcribe un audio (Buffer en cualquier formato que ffmpeg entienda) y
   * devuelve el texto reconocido. El idioma se detecta automáticamente.
   */
  async transcribe(audioBuffer: Buffer): Promise<string> {
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error('Audio vacío: no hay nada que transcribir.');
    }

    // Trabajo CPU-intensivo (ffmpeg + inferencia ONNX): pasa por el semáforo
    // global para que N audios simultáneos no saturen todos los cores.
    return cpuSemaphore.run(async () => {
      // 1) Decodifica a PCM float32 mono 16 kHz (lo que espera Whisper).
      const pcm = await this.decodeToFloat32(audioBuffer);
      if (pcm.length === 0) {
        throw new Error('No se pudo extraer audio del archivo.');
      }

      // 2) Transcribe SIEMPRE como transcripción (task 'transcribe', nunca
      // traducción): el texto queda en el idioma en que habló el cliente, sea
      // cual sea. chunk/stride permiten audios largos.
      const transcriber = await this.getTranscriber();
      const output = await transcriber(pcm, {
        chunk_length_s: 30,
        stride_length_s: 5,
        task: 'transcribe',
        ...(this.language !== 'auto' ? { language: this.language } : {}),
      });

      const text =
        typeof output === 'string' ? output : (output?.text as string) ?? '';
      return text.trim();
    });
  }

  /**
   * Decodifica el audio de entrada a Float32Array PCM mono 16 kHz usando
   * ffmpeg-static (formato f32le por stdout, sin tocar disco).
   */
  private decodeToFloat32(audioBuffer: Buffer): Promise<Float32Array> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ffmpegPath: string = require('ffmpeg-static');
    if (!ffmpegPath) {
      return Promise.reject(
        new Error('ffmpeg-static no disponible (binario ffmpeg).'),
      );
    }

    return new Promise<Float32Array>((resolve, reject) => {
      const args = [
        '-hide_banner',
        '-loglevel',
        'error',
        '-i',
        'pipe:0',
        '-ar',
        String(this.sampleRate),
        '-ac',
        '1',
        '-f',
        'f32le',
        'pipe:1',
      ];

      const proc = spawn(ffmpegPath, args);
      const chunks: Buffer[] = [];
      let stderr = '';

      const timer = setTimeout(() => {
        proc.kill('SIGKILL');
        reject(new Error('ffmpeg excedió el tiempo límite al decodificar el audio.'));
      }, 120000);

      proc.stdout.on('data', (d: Buffer) => chunks.push(d));
      proc.stderr.on('data', (d) => {
        stderr += d.toString();
      });
      proc.on('error', (err) => {
        clearTimeout(timer);
        reject(new Error(`No se pudo ejecutar ffmpeg: ${err.message}`));
      });
      proc.on('close', (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          reject(new Error(`ffmpeg salió con código ${code}: ${stderr.slice(0, 500)}`));
          return;
        }
        const raw = Buffer.concat(chunks);
        // Copia a un Uint8Array con offset 0 para una vista Float32 alineada.
        const u8 = new Uint8Array(raw);
        const floats = new Float32Array(
          u8.buffer,
          0,
          Math.floor(u8.length / 4),
        );
        resolve(floats);
      });

      // Alimenta el audio por stdin.
      proc.stdin.on('error', () => {
        /* EPIPE si ffmpeg cierra antes; se ignora, el evento close lo maneja. */
      });
      proc.stdin.write(audioBuffer);
      proc.stdin.end();
    });
  }
}
