import { Logger } from '@nestjs/common';

/**
 * Tabla de precios de los modelos de IA soportados.
 *
 * Las cifras son USD por 1.000.000 de tokens, separando input (prompt) y
 * output (completion). La clave es `provider:model` normalizada a minúsculas.
 *
 * TODO: verificar contra el pricing oficial de cada proveedor (los valores
 * iniciales son aproximados y pueden cambiar).
 */

const logger = new Logger('AiPricing');

/** Precio por 1M de tokens, separado en input/output. */
interface ModelPrice {
  input: number; // USD por 1M tokens de prompt
  output: number; // USD por 1M tokens de completion
}

/** Mapa `provider:model` (minúsculas) → precio por 1M de tokens. */
export const AI_PRICING: Record<string, ModelPrice> = {
  // ── Google Gemini ──
  'google:gemini-2.5-flash': { input: 0.3, output: 2.5 },
  'google:gemini-2.5-pro': { input: 1.25, output: 10.0 },
  'google:gemini-2.0-flash': { input: 0.1, output: 0.4 },
  'google:gemini-1.5-flash': { input: 0.075, output: 0.3 },
  'google:gemini-1.5-pro': { input: 1.25, output: 5.0 },

  // ── OpenAI ──
  'openai:gpt-4o': { input: 2.5, output: 10.0 },
  'openai:gpt-4o-mini': { input: 0.15, output: 0.6 },

  // ── Anthropic (Claude) ──
  'anthropic:claude-sonnet-4-6': { input: 3.0, output: 15.0 },
  'anthropic:claude-haiku-4-5': { input: 1.0, output: 5.0 },
  'anthropic:claude-3-5-sonnet-latest': { input: 3.0, output: 15.0 },

  // ── DeepSeek ──
  'deepseek:deepseek-chat': { input: 0.27, output: 1.1 },
  'deepseek:deepseek-reasoner': { input: 0.55, output: 2.19 },
};

/**
 * Calcula el costo en USD de una invocación a partir de los tokens consumidos.
 * costUsd = prompt/1e6*input + completion/1e6*output.
 *
 * Si el modelo no está en la tabla devuelve 0 y deja un warn (para detectar
 * que falta cargar su precio).
 */
export function computeCostUsd(
  provider: string,
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const key = `${(provider ?? '').toLowerCase()}:${(model ?? '').toLowerCase()}`;
  const price = AI_PRICING[key];
  if (!price) {
    logger.warn(
      `No hay precio para "${key}". costUsd=0. ` +
        'Debe cargarse en AI_PRICING (src/modules/metering/ai-pricing.ts).',
    );
    return 0;
  }
  const prompt = Number.isFinite(promptTokens) ? promptTokens : 0;
  const completion = Number.isFinite(completionTokens) ? completionTokens : 0;
  return (prompt / 1e6) * price.input + (completion / 1e6) * price.output;
}
