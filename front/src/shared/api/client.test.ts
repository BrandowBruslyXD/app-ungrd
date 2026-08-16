import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  apiFetch,
  ErrorApi,
  ESTADO_RESPUESTA_ILEGIBLE,
  ESTADO_SIN_CONEXION,
  ESTADO_TIEMPO_AGOTADO,
  esErrorApi,
  guardarToken,
  limpiarToken,
  obtenerToken,
  TIEMPO_LIMITE_MS,
} from './client';

function respuesta(cuerpo: string, init: ResponseInit = {}): Response {
  return new Response(cuerpo, { status: 200, ...init });
}

function cabecerasDeLlamada(indice = 0): Headers {
  const mock = vi.mocked(globalThis.fetch);
  const opciones = mock.mock.calls[indice]?.[1];
  return new Headers(opciones?.headers);
}

describe('apiFetch', () => {
  beforeEach(() => {
    limpiarToken();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    limpiarToken();
  });

  it('devuelve el JSON tipado cuando la respuesta es correcta', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(respuesta('{"codigo":"RPT-2026-08-15-0047"}'));

    const datos = await apiFetch<{ codigo: string }>('/reportes/RPT-2026-08-15-0047');

    expect(datos.codigo).toBe('RPT-2026-08-15-0047');
  });

  it('no manda cabecera Authorization cuando no hay sesion', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(respuesta('[]'));

    await apiFetch('/reportes');

    expect(cabecerasDeLlamada().has('Authorization')).toBe(false);
  });

  it('agrega el token como Bearer cuando hay sesion iniciada', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(respuesta('[]'));
    guardarToken('token-de-prueba');

    await apiFetch('/reportes/mios');

    expect(cabecerasDeLlamada().get('Authorization')).toBe('Bearer token-de-prueba');
    expect(obtenerToken()).toBe('token-de-prueba');
  });

  it('deja de mandar el token despues de limpiar la sesion', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(respuesta('[]'));
    guardarToken('token-de-prueba');
    limpiarToken();

    await apiFetch('/reportes/mios');

    expect(cabecerasDeLlamada().has('Authorization')).toBe(false);
    expect(obtenerToken()).toBeNull();
  });

  it('aborta la peticion y falla con tiempo agotado al superar el limite', async () => {
    vi.useFakeTimers();
    vi.mocked(globalThis.fetch).mockImplementation(
      (_entrada: RequestInfo | URL, opciones?: RequestInit) =>
        new Promise<Response>((_resolver, rechazar) => {
          opciones?.signal?.addEventListener('abort', () => {
            rechazar(new DOMException('The operation was aborted.', 'AbortError'));
          });
        }),
    );

    const peticion = apiFetch('/reportes');
    const esperado = expect(peticion).rejects.toMatchObject({ estado: ESTADO_TIEMPO_AGOTADO });
    await vi.advanceTimersByTimeAsync(TIEMPO_LIMITE_MS);

    await esperado;
  });

  it('respeta un tiempo limite propio mas corto', async () => {
    vi.useFakeTimers();
    vi.mocked(globalThis.fetch).mockImplementation(
      (_entrada: RequestInfo | URL, opciones?: RequestInit) =>
        new Promise<Response>((_resolver, rechazar) => {
          opciones?.signal?.addEventListener('abort', () => {
            rechazar(new DOMException('The operation was aborted.', 'AbortError'));
          });
        }),
    );

    const peticion = apiFetch('/reportes', { tiempoLimiteMs: 1000 });
    const esperado = expect(peticion).rejects.toBeInstanceOf(ErrorApi);
    await vi.advanceTimersByTimeAsync(1000);

    await esperado;
  });

  it('traduce un fallo de red a ErrorApi sin conexion', async () => {
    vi.mocked(globalThis.fetch).mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(apiFetch('/reportes')).rejects.toMatchObject({ estado: ESTADO_SIN_CONEXION });
  });

  it('no revienta cuando el error del servidor llega en HTML en vez de JSON', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      respuesta('<html><body>502 Bad Gateway</body></html>', {
        status: 502,
        headers: { 'Content-Type': 'text/html' },
      }),
    );

    const fallo = await apiFetch('/reportes').catch((causa: unknown) => causa);

    expect(esErrorApi(fallo)).toBe(true);
    expect((fallo as ErrorApi).estado).toBe(502);
    expect((fallo as ErrorApi).detalles).toBeNull();
  });

  it('no revienta cuando una respuesta correcta no es JSON', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(respuesta('esto no es json'));

    await expect(apiFetch('/reportes')).rejects.toMatchObject({
      estado: ESTADO_RESPUESTA_ILEGIBLE,
    });
  });

  it('conserva mensaje y detalles del error del contrato', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      respuesta(
        JSON.stringify({
          error: 'Datos inválidos',
          detalles: { descripcion: 'La descripción es obligatoria' },
        }),
        { status: 400 },
      ),
    );

    const fallo: unknown = await apiFetch('/reportes', { method: 'POST' }).catch(
      (causa: unknown) => causa,
    );

    expect(esErrorApi(fallo)).toBe(true);
    const error = fallo as ErrorApi;
    expect(error.estado).toBe(400);
    expect(error.mensaje).toBe('Datos inválidos');
    expect(error.detalles).toEqual({ descripcion: 'La descripción es obligatoria' });
  });
});
