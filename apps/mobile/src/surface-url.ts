// Only gates for navigation and framing: nothing else navigates to, or frames, a URL taken from server data.

function hasControlOrSpace(value: string): boolean {
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code <= 0x20 || code === 0x7f) return true;
  }
  return false;
}

/** A same-origin path with a single leading slash and no backslash (browsers read `/\x` as `//x`). */
function isLocalPath(value: string): boolean {
  return value.startsWith("/") && !value.startsWith("//") && !value.includes("\\");
}

/**
 * Sandbox for a framed view. Scripts only: no `allow-same-origin` (the frame gets an opaque origin, so it cannot
 * reach the page or drop its own sandbox), and no navigation, forms, popups, modals or downloads.
 */
export const SURFACE_SANDBOX = "allow-scripts";

/**
 * A plain DNS name: lower-case ASCII letters, digits, hyphens and dots, no trailing dot, no punycode label, not an
 * IP address in any notation. Anything else is ambiguous (look-alike or numeric hosts) and never matches.
 */
export function isPlainHostname(host: string): boolean {
  if (host === "" || host.length > 253 || host.endsWith(".")) return false;
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/.test(host)) return false;
  if (/^[0-9.]+$/.test(host)) return false;
  return !host.split(".").some((label) => label.startsWith("xn--"));
}

/** Origins named in a comma-separated build setting: `https:` only, no credentials, no path. Anything else is dropped. */
export function parseOrigins(raw: string | undefined): string[] {
  const out: string[] = [];
  for (const part of (raw ?? "").split(",")) {
    const text = part.trim();
    if (text === "" || hasControlOrSpace(text)) continue;
    try {
      const url = new URL(text);
      const bare = url.pathname === "/" && url.search === "" && url.hash === "";
      if (
        url.protocol === "https:" &&
        isPlainHostname(url.hostname) &&
        url.username === "" &&
        url.password === "" &&
        bare
      ) {
        if (!out.includes(url.origin)) out.push(url.origin);
      }
    } catch {
      // not a URL: dropped
    }
  }
  return out;
}

/**
 * A same-origin path, or an absolute `https:` URL whose origin is in `allowedOrigins` (default: none). Credentials in
 * the URL are refused and the origin is compared after parsing, so `https://a@evil.example` and `HTTPS://EVIL.example`
 * never match an allowed origin.
 */
export function safeSignInTarget(
  value: unknown,
  allowedOrigins: readonly string[] = [],
): string | null {
  if (typeof value !== "string" || value === "" || value.length > 2048) return null;
  if (hasControlOrSpace(value)) return null;
  if (isLocalPath(value)) return value;
  if (!/^https:\/\/[^/?#\\]+/i.test(value) || value.includes("\\")) return null;
  if ((/^https:\/\/([^/?#]*)/i.exec(value)?.[1] ?? "").includes("@")) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      !isPlainHostname(url.hostname) ||
      url.username !== "" ||
      url.password !== ""
    )
      return null;
    return allowedOrigins.includes(url.origin) ? value : null;
  } catch {
    return null;
  }
}

/** A same-origin path for an embedded view: at most 200 characters, no traversal, no encoded separators. */
export function safeSurfacePath(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > 200) return null;
  if (hasControlOrSpace(value) || !isLocalPath(value)) return null;
  if (value.includes("..") || value.indexOf("//", 1) !== -1) return null;
  const firstSlash = value.indexOf("/");
  if (value.slice(0, firstSlash).includes(":")) return null;
  if (/%(2e|2f|5c)/i.test(value)) return null;
  return value;
}

/** Path prefixes (comma-separated build setting) that may be framed: plain paths, no query, no root. Default: none. */
export function parseEmbedPrefixes(raw: string | undefined): string[] {
  const out: string[] = [];
  for (const part of (raw ?? "").split(",")) {
    const text = part.trim().replace(/\/+$/, "");
    if (text.length < 2 || /[?#]/.test(text) || safeSurfacePath(text) === null) continue;
    if (!out.includes(text)) out.push(text);
  }
  return out;
}

export function isEmbedPathAllowed(path: string, prefixes: readonly string[]): boolean {
  const pathname = path.split(/[?#]/)[0] ?? "";
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export type SurfaceMode = "unavailable" | "text" | "open" | "frame";

/** What the client does with a backend-listed view. Only a `presence` view on a listed prefix is framed; a console view is only ever opened. */
export function surfaceMode(
  surface: { kind: string; path: unknown },
  platform: string,
  embedPrefixes: readonly string[],
): SurfaceMode {
  const path = safeSurfacePath(surface.path);
  if (path === null) return "unavailable";
  if (platform !== "web") return "text";
  if (surface.kind === "console") return "open";
  if (surface.kind !== "presence") return "unavailable";
  return isEmbedPathAllowed(path, embedPrefixes) ? "frame" : "unavailable";
}
