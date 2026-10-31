/**
 * The preview viewer is a developer-configured, passive visual surface.
 * It has no agent credentials, command channel, approvals, or tool authority.
 */
export type AvatarViewerPlatform = "web" | "native";

export function resolveAvatarViewerUrl(
  raw: string | undefined,
  platform: AvatarViewerPlatform,
  development: boolean,
): string | null {
  if (!raw || raw.trim() !== raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.username || parsed.password || parsed.search || parsed.hash) return null;
    const loopback = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    const localWeb = platform === "web" && development && loopback && parsed.protocol === "http:";
    if (!localWeb && parsed.protocol !== "https:") return null;
    if (!parsed.pathname.endsWith("/runtime/index.html")) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}
