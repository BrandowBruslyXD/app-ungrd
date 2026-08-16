/**
 * Semáforo de CPU para trabajos PESADOS en proceso (Whisper/ONNX, OCR/WASM).
 *
 * Sin límite, N notas de voz simultáneas disparan N inferencias en paralelo y
 * saturan todos los cores del servidor (afectando al API, al motor y al resto
 * de tenants). Este semáforo acota cuántos trabajos pesados corren A LA VEZ;
 * los demás esperan en cola FIFO.
 *
 * - Concurrencia: CPU_HEAVY_CONCURRENCY (default 2).
 * - Espera máxima en cola: CPU_HEAVY_MAX_WAIT_MS (default 60000). Si se agota,
 *   el trabajo falla rápido ("servidor ocupado") y el flujo lo deriva a su
 *   rama de error, en lugar de acumular una cola infinita que deja al bot
 *   mudo por minutos.
 *
 * Es una instancia ÚNICA de proceso (module-level) compartida por transcripción
 * y OCR: el presupuesto de CPU es uno solo, no uno por servicio.
 */
class Semaphore {
  private active = 0;
  private readonly queue: {
    resolve: () => void;
    reject: (err: Error) => void;
    timer: NodeJS.Timeout;
  }[] = [];

  constructor(
    private readonly limit: number,
    private readonly maxWaitMs: number,
  ) {}

  /** Ejecuta `fn` cuando haya cupo; libera el cupo al terminar (éxito o error). */
  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.active < this.limit) {
      this.active += 1;
      return Promise.resolve();
    }
    return new Promise<void>((resolve, reject) => {
      const entry = {
        resolve: () => {
          clearTimeout(entry.timer);
          this.active += 1;
          resolve();
        },
        reject,
        timer: setTimeout(() => {
          const idx = this.queue.indexOf(entry);
          if (idx !== -1) this.queue.splice(idx, 1);
          reject(
            new Error(
              'El servidor está procesando muchos audios/imágenes a la vez. Inténtalo de nuevo en un momento.',
            ),
          );
        }, this.maxWaitMs),
      };
      this.queue.push(entry);
    });
  }

  private release(): void {
    this.active -= 1;
    const next = this.queue.shift();
    if (next) next.resolve();
  }
}

/** Semáforo global de proceso para Whisper (STT) y Tesseract (OCR). */
export const cpuSemaphore = new Semaphore(
  Math.max(1, Number(process.env.CPU_HEAVY_CONCURRENCY ?? 2)),
  Math.max(1000, Number(process.env.CPU_HEAVY_MAX_WAIT_MS ?? 60000)),
);
