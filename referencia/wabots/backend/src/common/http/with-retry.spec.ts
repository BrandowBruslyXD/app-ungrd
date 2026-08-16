import { withRetry, isTransientHttpError } from './with-retry';

/**
 * Fabrica un error "estilo axios": la detección de axios.isAxiosError se basa
 * en la marca `isAxiosError === true`, así que no hace falta axios real.
 */
function axiosError(status?: number): Error {
  const err: any = new Error(status ? `HTTP ${status}` : 'network down');
  err.isAxiosError = true;
  if (status !== undefined) err.response = { status };
  return err;
}

describe('isTransientHttpError', () => {
  it('considera transitorio un error de red (axios sin response)', () => {
    expect(isTransientHttpError(axiosError())).toBe(true);
  });

  it('considera transitorios 429 y 5xx, pero no 400/401', () => {
    expect(isTransientHttpError(axiosError(429))).toBe(true);
    expect(isTransientHttpError(axiosError(503))).toBe(true);
    expect(isTransientHttpError(axiosError(400))).toBe(false);
    expect(isTransientHttpError(axiosError(401))).toBe(false);
  });

  it('no considera transitorio un error que no es de axios', () => {
    expect(isTransientHttpError(new Error('cualquiera'))).toBe(false);
  });
});

describe('withRetry', () => {
  it('reintenta ante error de red y termina OK si el 2º intento funciona', async () => {
    const fn = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce(axiosError())
      .mockResolvedValueOnce('ok');

    const result = await withRetry(fn, { retries: 2, baseDelayMs: 1 });

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('NO reintenta ante 401: lanza al primer intento', async () => {
    const err = axiosError(401);
    const fn = jest.fn<Promise<never>, []>().mockRejectedValue(err);

    await expect(withRetry(fn, { retries: 2, baseDelayMs: 1 })).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('NO reintenta ante 400: lanza al primer intento', async () => {
    const err = axiosError(400);
    const fn = jest.fn<Promise<never>, []>().mockRejectedValue(err);

    await expect(withRetry(fn, { retries: 2, baseDelayMs: 1 })).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('reintenta ante 429, agota los reintentos y lanza el último error', async () => {
    const err = axiosError(429);
    const fn = jest.fn<Promise<never>, []>().mockRejectedValue(err);

    // retries: 2 → 1 intento inicial + 2 reintentos = 3 llamadas en total.
    await expect(withRetry(fn, { retries: 2, baseDelayMs: 1 })).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('reintenta ante 503 y termina OK si un intento posterior funciona', async () => {
    const fn = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce(axiosError(503))
      .mockRejectedValueOnce(axiosError(503))
      .mockResolvedValueOnce('ok');

    const result = await withRetry(fn, { retries: 2, baseDelayMs: 1 });

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
