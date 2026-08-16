import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiFetch, ErrorApi } from './client';

/*
 * Este cliente todavía no lo llama ninguna pantalla: es el que va a usar la
 * integración con el backend. Se prueba ahora justamente por eso — los caminos
 * que rompen aquí (respuesta sin JSON, cuerpo vacío, red caída) no se ven en
 * desarrollo, donde el servidor siempre contesta bien, sino en el teléfono de
 * alguien que está reportando una emergencia con dos rayas de señal.
 */

function respuesta(status: number, cuerpo?: unknown, opciones?: { textoPlano?: boolean }) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (opciones?.textoPlano) throw new SyntaxError('Unexpected token < in JSON');
      return cuerpo;
    },
  } as Response;
}

describe('apiFetch', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  describe('respuestas correctas', () => {
    it('devuelve el cuerpo ya convertido cuando la respuesta es 200', async () => {
      vi.mocked(fetch).mockResolvedValue(respuesta(200, { codigo: 'RPT-1' }));

      await expect(apiFetch('/reportes')).resolves.toEqual({ codigo: 'RPT-1' });
    });

    it('no intenta leer el cuerpo de un 204, que no lo trae', async () => {
      /* Doble conversión a propósito: este doble solo trae lo que `apiFetch`
         mira, y su `json` no devuelve nada nunca, así que TypeScript no lo ve
         solaparse con `Response`. Completar las trece propiedades que faltan no
         probaría nada más. */
      const sinCuerpo = {
        ok: true,
        status: 204,
        json: async () => {
          throw new SyntaxError('Unexpected end of JSON input');
        },
      } as unknown as Response;
      vi.mocked(fetch).mockResolvedValue(sinCuerpo);

      await expect(apiFetch('/reportes/RPT-1/estado')).resolves.toBeUndefined();
    });
  });

  describe('respuestas de error', () => {
    it('usa el mensaje del backend cuando lo trae', async () => {
      vi.mocked(fetch).mockResolvedValue(
        respuesta(400, { error: 'El tipo de reporte no es válido', detalles: { tipo: 'inválido' } })
      );

      await expect(apiFetch('/reportes')).rejects.toMatchObject({
        message: 'El tipo de reporte no es válido',
        estado: 400,
        detalles: { tipo: 'inválido' },
      });
    });

    it('explica el fallo en español cuando la respuesta de error no es JSON', async () => {
      // Un 502 del proxy devuelve HTML. Antes se lanzaba Error("undefined").
      vi.mocked(fetch).mockResolvedValue(respuesta(502, undefined, { textoPlano: true }));

      const fallo = await apiFetch('/reportes').catch((e: unknown) => e);

      expect(fallo).toBeInstanceOf(ErrorApi);
      expect((fallo as ErrorApi).message).not.toContain('undefined');
      expect((fallo as ErrorApi).estado).toBe(502);
    });

    it('marca como fallo de red cuando fetch no llega a responder', async () => {
      vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(apiFetch('/reportes')).rejects.toMatchObject({
        estado: 0,
        esFalloDeRed: true,
      });
    });
  });

  describe('tiempo límite y cancelación', () => {
    it('corta la petición aunque quien llama traiga su propia señal', async () => {
      /*
       * El fallo que cubre esta prueba: al reenviar la señal externa tal cual,
       * la petición se quedaba sin tiempo límite y el cargador giraba para
       * siempre. La señal que llega a fetch tiene que ser siempre la propia.
       */
      vi.useFakeTimers();
      const externo = new AbortController();
      let señalRecibida: AbortSignal | undefined;

      vi.mocked(fetch).mockImplementation((_url, init) => {
        señalRecibida = init?.signal ?? undefined;
        return new Promise((_, rechazar) => {
          init?.signal?.addEventListener('abort', () =>
            rechazar(new DOMException('Aborted', 'AbortError'))
          );
        });
      });

      const pendiente = apiFetch('/reportes', { signal: externo.signal });
      const comprobacion = expect(pendiente).rejects.toMatchObject({ esFalloDeRed: true });

      await vi.advanceTimersByTimeAsync(20000);
      await comprobacion;

      expect(señalRecibida).not.toBe(externo.signal);
    });

    it('propaga la cancelación de quien llama sin convertirla en error de red', async () => {
      // Una pantalla que se cierra a medio cargar no es un fallo que mostrar.
      const externo = new AbortController();
      vi.mocked(fetch).mockImplementation((_url, init) =>
        new Promise((_, rechazar) => {
          init?.signal?.addEventListener('abort', () =>
            rechazar(new DOMException('Aborted', 'AbortError'))
          );
        })
      );

      const pendiente = apiFetch('/reportes', { signal: externo.signal });
      externo.abort();

      const fallo = await pendiente.catch((e: unknown) => e);
      expect(fallo).not.toBeInstanceOf(ErrorApi);
      expect((fallo as DOMException).name).toBe('AbortError');
    });

    it('respeta una señal que ya venía cancelada antes de llamar', async () => {
      const externo = new AbortController();
      externo.abort();
      vi.mocked(fetch).mockImplementation((_url, init) =>
        init?.signal?.aborted
          ? Promise.reject(new DOMException('Aborted', 'AbortError'))
          : Promise.resolve(respuesta(200, {}))
      );

      const fallo = await apiFetch('/reportes', { signal: externo.signal }).catch(
        (e: unknown) => e
      );

      expect((fallo as DOMException).name).toBe('AbortError');
    });
  });
});
