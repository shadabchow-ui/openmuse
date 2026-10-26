/** Web randomness and SHA-256 (the web build uses cookie mode, never native auth). */

export const random = (n: number): Uint8Array =>
  globalThis.crypto.getRandomValues(new Uint8Array(n));

export const sha256 = async (data: string): Promise<Uint8Array> =>
  new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(data)));
