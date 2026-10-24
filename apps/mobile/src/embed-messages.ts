import { z } from "zod";
import { SURFACE_SANDBOX } from "./surface-url";

/**
 * The only messages a framed view may send the page, and the only way a frame is built. The frame runs in an
 * opaque origin, so nothing it says is trusted because of where it came from: a message is accepted only if it
 * comes from this frame's window, from the opaque origin, carries this embed's nonce, and matches a strict schema.
 * The page sends nothing to the frame.
 */

const nonce = z.string().regex(/^[0-9a-f]{32}$/);

export const embedMessageSchema = z.discriminatedUnion("type", [
  z.strictObject({ v: z.literal(1), type: z.literal("ready"), nonce }),
  z.strictObject({
    v: z.literal(1),
    type: z.literal("resize"),
    nonce,
    height: z.number().int().min(120).max(2000),
  }),
]);
export type EmbedMessage = z.infer<typeof embedMessageSchema>;

/** A fresh 128-bit nonce for one embed, or null when no secure random source exists (the view then stays closed). */
export function newEmbedNonce(
  random:
    | { getRandomValues?: (bytes: Uint8Array) => Uint8Array }
    | null
    | undefined = globalThis.crypto,
): string | null {
  if (typeof random?.getRandomValues !== "function") return null;
  const bytes = random.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export interface EmbedMessageContext {
  /** The nonce this embed was created with. */
  expectedNonce: string;
  /** True only when `event.source` is this frame's own window. */
  sourceIsFrame: boolean;
  /** `event.origin`. */
  origin: string;
  /** The page's own origin; a frame that reports it has lost its sandbox. */
  pageOrigin: string;
}

/** The message if every check passes, else null. Never throws. */
export function acceptEmbedMessage(
  context: EmbedMessageContext,
  data: unknown,
): EmbedMessage | null {
  if (!context.sourceIsFrame) return null;
  if (context.origin !== "null" || context.origin === context.pageOrigin) return null;
  if (typeof data !== "object" || data === null || Array.isArray(data)) return null;
  const parsed = embedMessageSchema.safeParse(data);
  if (!parsed.success) return null;
  return parsed.data.nonce === context.expectedNonce ? parsed.data : null;
}

/** Everything the iframe element is given. The nonce travels in the fragment, so it is not sent to the server. */
export function frameProps(path: string, title: string, embedNonce: string) {
  const base = path.split("#")[0] ?? path;
  return {
    src: `${base}#embed=${embedNonce}`,
    title,
    sandbox: SURFACE_SANDBOX,
    referrerPolicy: "no-referrer" as const,
    allow: "",
    style: { width: "100%", height: "100%", border: 0, borderRadius: 12 },
  };
}
