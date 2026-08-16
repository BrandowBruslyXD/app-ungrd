import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

import { cpuSemaphore } from '../../../common/concurrency/cpu-semaphore';

/**
 * OCR (imagen → texto) 100% OFFLINE con tesseract.js (WASM puro JS).
 *
 * Reutiliza un único worker por idioma (lazy). Los datos de idioma 'spa'
 * (traineddata) los descarga/cachea tesseract.js en runtime la primera vez;
 * la caché se fija con TESSDATA_PREFIX/cachePath para que persista entre
 * ejecuciones. No depende de ningún binario del sistema.
 *
 * La dependencia `tesseract.js` se carga con require dinámico para no romper
 * el arranque si aún no está instalada (se instala en el deploy).
 */
@Injectable()
export class OcrService implements OnModuleDestroy {
  private readonly logger = new Logger(OcrService.name);

  /** Carpeta de caché de los traineddata (persistente entre arranques). */
  private readonly cachePath = process.env.TESSERACT_CACHE_PATH || '/opt/models/tesseract';

  /** Workers reutilizables, indexados por idioma. */
  private readonly workers = new Map<string, any>();
  /** Promesas de creación en curso (evita crear dos workers del mismo idioma). */
  private readonly creating = new Map<string, Promise<any>>();

  /** Crea (o reutiliza) un worker de tesseract.js para el idioma dado. */
  private async getWorker(lang: string): Promise<any> {
    const existing = this.workers.get(lang);
    if (existing) return existing;

    const inFlight = this.creating.get(lang);
    if (inFlight) return inFlight;

    const promise = (async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { createWorker } = require('tesseract.js');
      this.logger.log(`Inicializando worker OCR tesseract.js (idioma=${lang}) ...`);

      // Garantiza que exista la carpeta de caché para que la primera descarga
      // se persista en el volumen (si falla, tesseract sigue funcionando).
      try {
        mkdirSync(this.cachePath, { recursive: true });
      } catch {
        /* noop */
      }

      // Si el traineddata YA está en el volumen, se usa como fuente LOCAL
      // (langPath) además de caché: cero dependencia del CDN en el arranque.
      // tesseract.js v5 guarda la caché descomprimida como `<lang>.traineddata`,
      // por eso gzip:false en la ruta local. Si aún no existe, se mantiene el
      // comportamiento actual: se descarga UNA vez del CDN al cachePath.
      const hasLocalData = existsSync(join(this.cachePath, `${lang}.traineddata`));

      // API v5: createWorker(lang, oem, options) ya inicializa el idioma.
      const worker = await createWorker(lang, 1, {
        cachePath: this.cachePath,
        ...(hasLocalData ? { langPath: this.cachePath, gzip: false } : {}),
        // Sin logger ruidoso en producción.
      });

      this.workers.set(lang, worker);
      this.logger.log(`Worker OCR listo (idioma=${lang}).`);
      return worker;
    })();

    this.creating.set(lang, promise);
    try {
      return await promise;
    } finally {
      this.creating.delete(lang);
    }
  }

  /**
   * Extrae el texto de una imagen (Buffer) usando OCR.
   * @param imageBuffer datos crudos de la imagen (jpeg/png/etc.).
   * @param lang idioma de tesseract (default 'spa').
   */
  async extractText(imageBuffer: Buffer, lang = 'spa'): Promise<string> {
    if (!imageBuffer || imageBuffer.length === 0) {
      throw new Error('Imagen vacía: no hay nada que analizar.');
    }

    // Reconocimiento WASM CPU-intensivo: comparte el semáforo global con la
    // transcripción (el presupuesto de CPU del servidor es uno solo).
    return cpuSemaphore.run(async () => {
      const worker = await this.getWorker(lang || 'spa');
      const { data } = await worker.recognize(imageBuffer);
      return (data?.text ?? '').trim();
    });
  }

  /** Termina los workers al apagar el módulo para liberar memoria/WASM. */
  async onModuleDestroy(): Promise<void> {
    for (const worker of this.workers.values()) {
      try {
        await worker.terminate();
      } catch {
        /* noop */
      }
    }
    this.workers.clear();
  }
}
