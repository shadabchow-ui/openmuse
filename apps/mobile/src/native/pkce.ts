/** PKCE helpers (RFC 7636, S256). The randomness and hash are injected. */

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

export function base64url(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!;
    const b = i + 1 < bytes.length ? bytes[i + 1]! : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2]! : 0;
    const triple = (a << 16) | (b << 8) | c;
    out += ALPHABET[(triple >> 18) & 63]!;
    out += ALPHABET[(triple >> 12) & 63]!;
    if (i + 1 < bytes.length) out += ALPHABET[(triple >> 6) & 63]!;
    if (i + 2 < bytes.length) out += ALPHABET[triple & 63]!;
  }
  return out;
}

export async function challengeFor(
  verifier: string,
  sha256: (data: string) => Promise<Uint8Array>,
): Promise<string> {
  return base64url(await sha256(verifier));
}

export interface PkceDeps {
  random: (n: number) => Uint8Array;
  sha256: (data: string) => Promise<Uint8Array>;
}

export interface PkcePair {
  verifier: string;
  challenge: string;
  state: string;
}

/** Verifier from 32 random bytes (43 chars), challenge S256, state from 24 bytes (32 chars). */
export async function createPkce(deps: PkceDeps): Promise<PkcePair> {
  const verifier = base64url(deps.random(32));
  const challenge = await challengeFor(verifier, deps.sha256);
  const state = base64url(deps.random(24));
  return { verifier, challenge, state };
}
