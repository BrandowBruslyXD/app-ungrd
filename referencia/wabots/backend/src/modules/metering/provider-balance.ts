import axios from 'axios';
import { assertPublicUrl } from '../integrations/services/http.service';

/** Resultado de consultar el saldo de un proveedor de LLM. */
export interface ProviderBalance {
  available: boolean;
  balanceUsd?: number;
  currency?: string;
  note?: string;
}

/**
 * Consulta el SALDO disponible de un proveedor de LLM por su API, cuando el
 * proveedor lo expone. Es un helper puro (no es un provider de Nest).
 *
 * - `deepseek`: consulta GET /user/balance. La mayoría de proveedores no
 *   exponen saldo por API (google/openai/anthropic), en cuyo caso devuelve
 *   `available:false` con una nota explicativa.
 *
 * NUNCA lanza: ante cualquier error devuelve `{ available:false, note }`.
 */
export async function fetchProviderBalance(
  provider: string,
  apiKey: string,
  baseUrl?: string,
): Promise<ProviderBalance> {
  const p = (provider || '').toLowerCase().trim();

  try {
    switch (p) {
      case 'deepseek': {
        // DeepSeek expone el saldo en /user/balance.
        const url = `${(baseUrl || 'https://api.deepseek.com').replace(/\/+$/, '')}/user/balance`;
        // Anti-SSRF: baseUrl puede venir de la config del usuario.
        await assertPublicUrl(url);
        const { data } = await axios.get(url, {
          headers: { Authorization: `Bearer ${apiKey}` },
          timeout: 12000,
        });

        const infos: Array<any> = Array.isArray(data?.balance_infos)
          ? data.balance_infos
          : [];
        // Prefiere el saldo en USD si existe; si no, toma el primero disponible.
        const usdInfo = infos.find(
          (i) => String(i?.currency || '').toUpperCase() === 'USD',
        );
        const chosen = usdInfo || infos[0] || null;

        return {
          available: true,
          balanceUsd: chosen ? Number(chosen.total_balance) : undefined,
          currency: chosen?.currency,
        };
      }

      case 'google':
      case 'openai':
      case 'anthropic':
        return {
          available: false,
          note: 'El proveedor no expone el saldo por API.',
        };

      // openai_compatible | custom | otros: no hay forma estándar de consultarlo.
      default:
        return {
          available: false,
          note: 'Saldo no disponible para este proveedor.',
        };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      available: false,
      note: `No se pudo consultar el saldo: ${msg}`,
    };
  }
}
