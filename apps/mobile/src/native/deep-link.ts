/** Deep links: strict parsing of the app scheme to a closed set of routes. */

import type { NativeConfig } from "./config";

export type Route =
  | { kind: "task"; taskId: string }
  | { kind: "approval"; runId: string }
  | { kind: "chat" }
  | { kind: "notifications" }
  | { kind: "authCallback"; url: string };

export const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function parseDeepLink(url: string, cfg: NativeConfig): Route | null {
  const prefix = `${cfg.scheme}://`;
  if (!url.startsWith(prefix)) return null;
  const rest = url.slice(prefix.length);
  if (rest === "chat") return { kind: "chat" };
  if (rest === "notifications") return { kind: "notifications" };
  if (rest === "auth/callback" || rest.startsWith("auth/callback?")) {
    return { kind: "authCallback", url };
  }
  const task = /^task\/([^/?#]+)$/.exec(rest);
  if (task && UUID_RE.test(task[1]!)) return { kind: "task", taskId: task[1]! };
  const approval = /^approval\/([^/?#]+)$/.exec(rest);
  if (approval && UUID_RE.test(approval[1]!)) return { kind: "approval", runId: approval[1]! };
  return null;
}
