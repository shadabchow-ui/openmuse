/** Randomness and SHA-256 on device (relies on the app's getRandomValues polyfill). */

import { CryptoDigestAlgorithm, digest } from "expo-crypto";

export const random = (n: number): Uint8Array => crypto.getRandomValues(new Uint8Array(n));

export const sha256 = async (data: string): Promise<Uint8Array> =>
  new Uint8Array(await digest(CryptoDigestAlgorithm.SHA256, new TextEncoder().encode(data)));
