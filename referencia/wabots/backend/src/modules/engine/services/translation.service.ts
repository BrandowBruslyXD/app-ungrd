import { Injectable, Logger } from '@nestjs/common';

/**
 * Traducción de texto a texto 100% OFFLINE y sin API externa, con NLLB-200
 * (Transformers.js + ONNX). Detecta el idioma de ORIGEN automáticamente con
 * `franc` (JS puro, sin modelo) cuando no se indica.
 *
 * Pensado para abaratar planes: traducir multilenguaje SIN gastar tokens de un
 * LLM, incluso en flujos sin IA.
 *
 * Notas:
 *  - `@xenova/transformers` y `franc` son ESM; se importan con import() real
 *    (envuelto en Function para que TypeScript no lo degrade a require() en CJS).
 *  - El modelo se cachea en TRANSFORMERS_CACHE (volumen persistente) y se carga
 *    una sola vez (singleton de proceso, lazy).
 */
@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);

  private readonly modelId =
    process.env.NLLB_MODEL || 'Xenova/nllb-200-distilled-600M';

  private translator: any | null = null;
  private loading: Promise<any> | null = null;

  /** import() real (no convertible a require por TS) para paquetes ESM. */
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  private readonly dynamicImport = new Function('m', 'return import(m)') as (
    m: string,
  ) => Promise<any>;

  /** Mapa de códigos "amigables" → FLORES-200 (los que entiende NLLB). */
  private readonly friendlyToFlores: Record<string, string> = {
    es: 'spa_Latn',
    en: 'eng_Latn',
    fr: 'fra_Latn',
    pt: 'por_Latn',
    de: 'deu_Latn',
    it: 'ita_Latn',
    zh: 'zho_Hans',
    ja: 'jpn_Jpan',
    ru: 'rus_Cyrl',
    ar: 'arb_Arab',
  };

  /** Mapa de códigos ISO 639-3 (los que devuelve franc) → FLORES-200. */
  private readonly iso3ToFlores: Record<string, string> = {
    spa: 'spa_Latn',
    eng: 'eng_Latn',
    fra: 'fra_Latn',
    por: 'por_Latn',
    deu: 'deu_Latn',
    ita: 'ita_Latn',
    cmn: 'zho_Hans',
    zho: 'zho_Hans',
    jpn: 'jpn_Jpan',
    rus: 'rus_Cyrl',
    arb: 'arb_Arab',
    ara: 'arb_Arab',
  };

  /** Normaliza un código (amigable, ISO3 o ya FLORES) a FLORES-200. */
  private toFlores(code: string | undefined, fallback = 'eng_Latn'): string {
    if (!code) return fallback;
    const c = code.trim();
    if (c.includes('_')) return c; // ya parece FLORES (p.ej. spa_Latn)
    const lower = c.toLowerCase();
    return this.friendlyToFlores[lower] || this.iso3ToFlores[lower] || fallback;
  }

  /** Carga (perezosa) el pipeline de traducción. Singleton por proceso. */
  private async getTranslator(): Promise<any> {
    if (this.translator) return this.translator;
    if (this.loading) return this.loading;

    this.loading = (async () => {
      const { pipeline, env } = await this.dynamicImport('@xenova/transformers');
      env.cacheDir = process.env.TRANSFORMERS_CACHE || '/opt/models/transformers';
      env.allowRemoteModels = true;

      this.logger.log(`Cargando modelo de traducción "${this.modelId}" ...`);
      const t = await pipeline('translation', this.modelId);
      this.translator = t;
      this.logger.log('Modelo de traducción cargado.');
      return t;
    })();

    try {
      return await this.loading;
    } finally {
      this.loading = null;
    }
  }

  /** Detecta el idioma de un texto con franc y devuelve el FLORES correspondiente. */
  private async detectFlores(text: string): Promise<string> {
    try {
      const mod = await this.dynamicImport('franc');
      const franc = mod.franc || mod.default || mod;
      const iso3 = franc(text); // ISO 639-3 o 'und'
      if (iso3 && iso3 !== 'und') {
        return this.iso3ToFlores[iso3] || 'eng_Latn';
      }
    } catch (e) {
      this.logger.warn(`Detección de idioma falló: ${(e as Error).message}`);
    }
    return 'eng_Latn';
  }

  /**
   * Traduce `text` al idioma `opts.target`. Si `opts.source` falta o es 'auto',
   * detecta el idioma de origen automáticamente.
   */
  async translate(
    text: string,
    opts: { target: string; source?: string },
  ): Promise<string> {
    const clean = (text ?? '').trim();
    if (!clean) {
      throw new Error('Texto vacío: no hay nada que traducir.');
    }

    const tgt = this.toFlores(opts.target, 'spa_Latn');
    const src =
      !opts.source || opts.source.toLowerCase() === 'auto'
        ? await this.detectFlores(clean)
        : this.toFlores(opts.source);

    // Si origen y destino coinciden, no hay nada que traducir.
    if (src === tgt) return clean;

    const translator = await this.getTranslator();
    const output = await translator(clean, { src_lang: src, tgt_lang: tgt });

    const result = Array.isArray(output) ? output[0] : output;
    const translated = (result?.translation_text as string) ?? '';
    return translated.trim() || clean;
  }
}
