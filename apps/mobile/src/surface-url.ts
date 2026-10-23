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

/** Absolute `https:` URL or same-origin path; anything else (`javascript:`, `data:`, `//host`, non-strings) is refused. */
export function safeSignInTarget(value: unknown): string | null {
  if (typeof value !== "string" || value === "" || value.length > 2048) return null;
  if (hasControlOrSpace(value)) return null;
  if (isLocalPath(value)) return value;
  if (!/^https:\/\/[^/?#\\]+/i.test(value) || value.includes("\\")) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname !== "" ? value : null;
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
