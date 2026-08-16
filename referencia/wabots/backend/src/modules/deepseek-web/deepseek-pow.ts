// Port a TypeScript del POW DeepSeekHashV1 (single-thread, sin worker_threads).
//
// Algoritmo: SHA3-256 con Keccak-f[1600] saltando la ronda 0 (rondas 1..23).
// Input: salt + "_" + expire_at + "_" + nonce (utf8). El hash debe IGUALAR al
// challenge (32 bytes) — NO es comparación de target/difficulty.
// Ref: github.com/MrFadiAi/free-deepseek/blob/main/pow/deepseek_{hash,pow}.go
//
// Hay DOS implementaciones del hash:
//   - deepseekHashV1Ref : BigInt (lenta pero simple; es la referencia de oro).
//   - deepseekHashV1Fast : Uint32Array con lanes de 64 bits partidos en hi/lo
//     de 32 (velocidad de clase WASM en JS puro, ~10-30x más rápida).
// Al cargar el módulo se AUTOVERIFICA que Fast == Ref bit-a-bit sobre varias
// entradas; si difieren, `deepseekHashV1` usa la Ref (fail-safe): nunca se
// envía un POW mal calculado.

/** Descriptor del challenge de POW tal como llega de create_pow_challenge. */
export interface PowChallenge {
  algorithm: string;
  challenge: string;
  salt: string;
  difficulty: number;
  expire_at: number;
  signature: string;
  target_path: string;
}

const RC = new BigUint64Array([
  0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an, 0x8000000080008000n,
  0x000000000000808bn, 0x0000000080000001n, 0x8000000080008081n, 0x8000000000008009n,
  0x000000000000008an, 0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an,
  0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n, 0x8000000000008003n,
  0x8000000000008002n, 0x8000000000000080n, 0x000000000000800an, 0x800000008000000an,
  0x8000000080008081n, 0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n,
]);

const MASK64 = 0xffffffffffffffffn;
const rotl64 = (v: bigint, k: number): bigint =>
  ((v << BigInt(k)) | (v >> BigInt(64 - k))) & MASK64;

// ───────────────────────── REFERENCIA (BigInt) ─────────────────────────
function keccakF23Ref(s: BigUint64Array): void {
  let a0 = s[0], a1 = s[1], a2 = s[2], a3 = s[3], a4 = s[4];
  let a5 = s[5], a6 = s[6], a7 = s[7], a8 = s[8], a9 = s[9];
  let a10 = s[10], a11 = s[11], a12 = s[12], a13 = s[13], a14 = s[14];
  let a15 = s[15], a16 = s[16], a17 = s[17], a18 = s[18], a19 = s[19];
  let a20 = s[20], a21 = s[21], a22 = s[22], a23 = s[23], a24 = s[24];
  for (let r = 1; r < 24; r++) {
    const c0 = a0 ^ a5 ^ a10 ^ a15 ^ a20;
    const c1 = a1 ^ a6 ^ a11 ^ a16 ^ a21;
    const c2 = a2 ^ a7 ^ a12 ^ a17 ^ a22;
    const c3 = a3 ^ a8 ^ a13 ^ a18 ^ a23;
    const c4 = a4 ^ a9 ^ a14 ^ a19 ^ a24;
    const d0 = c4 ^ rotl64(c1, 1);
    const d1 = c0 ^ rotl64(c2, 1);
    const d2 = c1 ^ rotl64(c3, 1);
    const d3 = c2 ^ rotl64(c4, 1);
    const d4 = c3 ^ rotl64(c0, 1);
    a0 ^= d0; a5 ^= d0; a10 ^= d0; a15 ^= d0; a20 ^= d0;
    a1 ^= d1; a6 ^= d1; a11 ^= d1; a16 ^= d1; a21 ^= d1;
    a2 ^= d2; a7 ^= d2; a12 ^= d2; a17 ^= d2; a22 ^= d2;
    a3 ^= d3; a8 ^= d3; a13 ^= d3; a18 ^= d3; a23 ^= d3;
    a4 ^= d4; a9 ^= d4; a14 ^= d4; a19 ^= d4; a24 ^= d4;
    const b0 = a0;
    const b10 = rotl64(a1, 1);
    const b20 = rotl64(a2, 62);
    const b5 = rotl64(a3, 28);
    const b15 = rotl64(a4, 27);
    const b16 = rotl64(a5, 36);
    const b1 = rotl64(a6, 44);
    const b11 = rotl64(a7, 6);
    const b21 = rotl64(a8, 55);
    const b6 = rotl64(a9, 20);
    const b7 = rotl64(a10, 3);
    const b17 = rotl64(a11, 10);
    const b2 = rotl64(a12, 43);
    const b12 = rotl64(a13, 25);
    const b22 = rotl64(a14, 39);
    const b23 = rotl64(a15, 41);
    const b8 = rotl64(a16, 45);
    const b18 = rotl64(a17, 15);
    const b3 = rotl64(a18, 21);
    const b13 = rotl64(a19, 8);
    const b14 = rotl64(a20, 18);
    const b24 = rotl64(a21, 2);
    const b9 = rotl64(a22, 61);
    const b19 = rotl64(a23, 56);
    const b4 = rotl64(a24, 14);
    a0 = b0 ^ ((~b1) & b2);
    a1 = b1 ^ ((~b2) & b3);
    a2 = b2 ^ ((~b3) & b4);
    a3 = b3 ^ ((~b4) & b0);
    a4 = b4 ^ ((~b0) & b1);
    a5 = b5 ^ ((~b6) & b7);
    a6 = b6 ^ ((~b7) & b8);
    a7 = b7 ^ ((~b8) & b9);
    a8 = b8 ^ ((~b9) & b5);
    a9 = b9 ^ ((~b5) & b6);
    a10 = b10 ^ ((~b11) & b12);
    a11 = b11 ^ ((~b12) & b13);
    a12 = b12 ^ ((~b13) & b14);
    a13 = b13 ^ ((~b14) & b10);
    a14 = b14 ^ ((~b10) & b11);
    a15 = b15 ^ ((~b16) & b17);
    a16 = b16 ^ ((~b17) & b18);
    a17 = b17 ^ ((~b18) & b19);
    a18 = b18 ^ ((~b19) & b15);
    a19 = b19 ^ ((~b15) & b16);
    a20 = b20 ^ ((~b21) & b22);
    a21 = b21 ^ ((~b22) & b23);
    a22 = b22 ^ ((~b23) & b24);
    a23 = b23 ^ ((~b24) & b20);
    a24 = b24 ^ ((~b20) & b21);
    a0 ^= RC[r];
    a0 &= MASK64; a1 &= MASK64; a2 &= MASK64; a3 &= MASK64; a4 &= MASK64;
    a5 &= MASK64; a6 &= MASK64; a7 &= MASK64; a8 &= MASK64; a9 &= MASK64;
    a10 &= MASK64; a11 &= MASK64; a12 &= MASK64; a13 &= MASK64; a14 &= MASK64;
    a15 &= MASK64; a16 &= MASK64; a17 &= MASK64; a18 &= MASK64; a19 &= MASK64;
    a20 &= MASK64; a21 &= MASK64; a22 &= MASK64; a23 &= MASK64; a24 &= MASK64;
  }
  s[0] = a0; s[1] = a1; s[2] = a2; s[3] = a3; s[4] = a4;
  s[5] = a5; s[6] = a6; s[7] = a7; s[8] = a8; s[9] = a9;
  s[10] = a10; s[11] = a11; s[12] = a12; s[13] = a13; s[14] = a14;
  s[15] = a15; s[16] = a16; s[17] = a17; s[18] = a18; s[19] = a19;
  s[20] = a20; s[21] = a21; s[22] = a22; s[23] = a23; s[24] = a24;
}

export function deepseekHashV1Ref(data: Buffer): Buffer {
  const RATE = 136;
  const s = new BigUint64Array(25);
  let off = 0;
  while (off + RATE <= data.length) {
    for (let i = 0; i < RATE / 8; i++) {
      s[i] ^= Buffer.from(data.buffer, data.byteOffset + off + i * 8, 8).readBigUInt64LE(0);
    }
    keccakF23Ref(s);
    off += RATE;
  }
  const final = Buffer.alloc(RATE);
  data.slice(off).copy(final);
  final[data.length - off] = 0x06;
  final[RATE - 1] |= 0x80;
  for (let i = 0; i < RATE / 8; i++) {
    s[i] ^= final.readBigUInt64LE(i * 8);
  }
  keccakF23Ref(s);
  const out = Buffer.alloc(32);
  out.writeBigUInt64LE(s[0] & MASK64, 0);
  out.writeBigUInt64LE(s[1] & MASK64, 8);
  out.writeBigUInt64LE(s[2] & MASK64, 16);
  out.writeBigUInt64LE(s[3] & MASK64, 24);
  return out;
}

// ───────────────────────── RÁPIDA (Uint32, hi/lo) ─────────────────────────
// Constantes de ronda partidas en 32 bits.
const RC_LO = new Uint32Array(24);
const RC_HI = new Uint32Array(24);
for (let i = 0; i < 24; i++) {
  RC_LO[i] = Number(RC[i] & 0xffffffffn) >>> 0;
  RC_HI[i] = Number((RC[i] >> 32n) & 0xffffffffn) >>> 0;
}

// Permutación ρ+π: B[DEST[k]] = rotl64(A[k], ROT[k]).
const PI_DEST = new Uint8Array([0, 10, 20, 5, 15, 16, 1, 11, 21, 6, 7, 17, 2, 12, 22, 23, 8, 18, 3, 13, 14, 24, 9, 19, 4]);
const PI_ROT = new Uint8Array([0, 1, 62, 28, 27, 36, 44, 6, 55, 20, 3, 10, 43, 25, 39, 41, 45, 15, 21, 8, 18, 2, 61, 56, 14]);

// Buffers reutilizables (single-thread).
const _Clo = new Uint32Array(5), _Chi = new Uint32Array(5);
const _Dlo = new Uint32Array(5), _Dhi = new Uint32Array(5);
const _Blo = new Uint32Array(25), _Bhi = new Uint32Array(25);

function keccakF23Fast(lo: Uint32Array, hi: Uint32Array): void {
  for (let r = 1; r < 24; r++) {
    // θ
    for (let x = 0; x < 5; x++) {
      _Clo[x] = (lo[x] ^ lo[x + 5] ^ lo[x + 10] ^ lo[x + 15] ^ lo[x + 20]) >>> 0;
      _Chi[x] = (hi[x] ^ hi[x + 5] ^ hi[x + 10] ^ hi[x + 15] ^ hi[x + 20]) >>> 0;
    }
    for (let x = 0; x < 5; x++) {
      const x1 = (x + 1) % 5, x4 = (x + 4) % 5;
      const rl = ((_Clo[x1] << 1) | (_Chi[x1] >>> 31)) >>> 0; // rotl(C[x1],1)
      const rh = ((_Chi[x1] << 1) | (_Clo[x1] >>> 31)) >>> 0;
      _Dlo[x] = (_Clo[x4] ^ rl) >>> 0;
      _Dhi[x] = (_Chi[x4] ^ rh) >>> 0;
    }
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 25; y += 5) {
        lo[x + y] = (lo[x + y] ^ _Dlo[x]) >>> 0;
        hi[x + y] = (hi[x + y] ^ _Dhi[x]) >>> 0;
      }
    }
    // ρ + π
    for (let k = 0; k < 25; k++) {
      const n = PI_ROT[k], dst = PI_DEST[k];
      const l = lo[k], h = hi[k];
      let nl: number, nh: number;
      if (n === 0) { nl = l; nh = h; }
      else if (n < 32) { nl = ((l << n) | (h >>> (32 - n))) >>> 0; nh = ((h << n) | (l >>> (32 - n))) >>> 0; }
      else if (n === 32) { nl = h; nh = l; }
      else { const m = n - 32; nl = ((h << m) | (l >>> (32 - m))) >>> 0; nh = ((l << m) | (h >>> (32 - m))) >>> 0; }
      _Blo[dst] = nl; _Bhi[dst] = nh;
    }
    // χ
    for (let y = 0; y < 25; y += 5) {
      const l0 = _Blo[y], l1 = _Blo[y + 1], l2 = _Blo[y + 2], l3 = _Blo[y + 3], l4 = _Blo[y + 4];
      const h0 = _Bhi[y], h1 = _Bhi[y + 1], h2 = _Bhi[y + 2], h3 = _Bhi[y + 3], h4 = _Bhi[y + 4];
      lo[y] = (l0 ^ ((~l1) & l2)) >>> 0; hi[y] = (h0 ^ ((~h1) & h2)) >>> 0;
      lo[y + 1] = (l1 ^ ((~l2) & l3)) >>> 0; hi[y + 1] = (h1 ^ ((~h2) & h3)) >>> 0;
      lo[y + 2] = (l2 ^ ((~l3) & l4)) >>> 0; hi[y + 2] = (h2 ^ ((~h3) & h4)) >>> 0;
      lo[y + 3] = (l3 ^ ((~l4) & l0)) >>> 0; hi[y + 3] = (h3 ^ ((~h4) & h0)) >>> 0;
      lo[y + 4] = (l4 ^ ((~l0) & l1)) >>> 0; hi[y + 4] = (h4 ^ ((~h0) & h1)) >>> 0;
    }
    // ι
    lo[0] = (lo[0] ^ RC_LO[r]) >>> 0;
    hi[0] = (hi[0] ^ RC_HI[r]) >>> 0;
  }
}

export function deepseekHashV1Fast(data: Buffer): Buffer {
  if (!Buffer.isBuffer(data)) data = Buffer.from(data as any);
  const RATE = 136; // 17 lanes de 8 bytes
  const lo = new Uint32Array(25), hi = new Uint32Array(25);
  let off = 0;
  while (off + RATE <= data.length) {
    for (let i = 0; i < 17; i++) {
      lo[i] = (lo[i] ^ data.readUInt32LE(off + i * 8)) >>> 0;
      hi[i] = (hi[i] ^ data.readUInt32LE(off + i * 8 + 4)) >>> 0;
    }
    keccakF23Fast(lo, hi);
    off += RATE;
  }
  const final = Buffer.alloc(RATE);
  data.copy(final, 0, off);
  final[data.length - off] = 0x06;
  final[RATE - 1] |= 0x80;
  for (let i = 0; i < 17; i++) {
    lo[i] = (lo[i] ^ final.readUInt32LE(i * 8)) >>> 0;
    hi[i] = (hi[i] ^ final.readUInt32LE(i * 8 + 4)) >>> 0;
  }
  keccakF23Fast(lo, hi);
  const out = Buffer.alloc(32);
  for (let i = 0; i < 4; i++) {
    out.writeUInt32LE(lo[i], i * 8);
    out.writeUInt32LE(hi[i], i * 8 + 4);
  }
  return out;
}

// Autoverificación Fast == Ref (bit-a-bit) al cargar. Si difieren, se usa Ref.
let _useFast = true;
(function selfTestFast() {
  try {
    const lens = [1, 5, 33, 100, 135, 136, 137, 200, 271, 272, 273];
    for (const len of lens) {
      const b = Buffer.alloc(len);
      for (let i = 0; i < len; i++) b[i] = (i * 37 + 11) & 0xff;
      if (!deepseekHashV1Ref(b).equals(deepseekHashV1Fast(b))) { _useFast = false; return; }
    }
    for (let t = 0; t < 8; t++) {
      const len = 1 + Math.floor(Math.random() * 300);
      const b = Buffer.alloc(len);
      for (let i = 0; i < len; i++) b[i] = Math.floor(Math.random() * 256);
      if (!deepseekHashV1Ref(b).equals(deepseekHashV1Fast(b))) { _useFast = false; return; }
    }
  } catch { _useFast = false; }
})();

/** Hash DeepSeekHashV1: usa la impl rápida si pasó la autoverificación. */
export function deepseekHashV1(data: Buffer): Buffer {
  return _useFast ? deepseekHashV1Fast(data) : deepseekHashV1Ref(data);
}

/** ¿Se está usando la implementación rápida (pasó la autoverificación)? */
export function isFastPow(): boolean {
  return _useFast;
}

/** Prefijo del input del hash: `${salt}_${expireAt}_`. */
export function buildPrefix(salt: string, expireAt: number | string): string {
  return `${salt}_${expireAt}_`;
}

export interface SolvePowArgs {
  challenge: string;
  salt: string;
  expireAt: number | string;
  difficulty: number;
}

/**
 * Solver SINGLE-THREAD del POW. Busca el nonce `n` tal que
 * deepseekHashV1(salt_expireAt_n) === challenge (32 bytes). Devuelve el nonce
 * o -1 si no hay solución dentro de `difficulty`.
 */
export function solvePow({ challenge, salt, expireAt, difficulty }: SolvePowArgs): number {
  const target = Buffer.from(challenge, 'hex');
  if (target.length !== 32) throw new Error('challenge must be 32 bytes');
  const prefix = Buffer.from(buildPrefix(salt, expireAt), 'utf8');
  for (let n = 0; n < difficulty; n++) {
    const input = Buffer.concat([prefix, Buffer.from(String(n), 'utf8')]);
    if (deepseekHashV1(input).equals(target)) return n;
  }
  return -1;
}

/** Construye el header `x-ds-pow-response` (base64 del JSON del challenge + answer). */
export function buildPowHeader(c: PowChallenge, answer: number): string {
  const obj = {
    algorithm: c.algorithm,
    challenge: c.challenge,
    salt: c.salt,
    answer,
    signature: c.signature,
    target_path: c.target_path,
  };
  return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64');
}
