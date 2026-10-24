import { useState } from "react";
import { Platform, Text } from "react-native";
import type { RuntimeSurface } from "../../../packages/domain/src/muse-contract";
import { apiConfig } from "./api-config";
import { EmbedFrame } from "./embed-frame";
import { newEmbedNonce } from "./embed-messages";
import { safeSurfacePath, surfaceMode } from "./surface-url";
import { Button, s } from "./ui";

/**
 * A backend view. Only a `presence` view on a configured path prefix is framed (default: none), in a sandbox
 * without `allow-same-origin`; a `console` view is opened, never framed. The frame itself, and the validation of
 * what it sends, are in `embed-frame.tsx` and `embed-messages.ts`.
 */
export function EmbeddedSurface({ surface }: { surface: RuntimeSurface }) {
  const mode = surfaceMode(surface, Platform.OS, apiConfig.embedPrefixes);
  const path = safeSurfacePath(surface.path);
  const [nonce] = useState(() => (mode === "frame" ? newEmbedNonce() : null));

  if (mode === "unavailable" || path === null)
    return <Text style={s.muted}>This view is not available.</Text>;
  if (mode === "text") return <Text style={s.muted}>Open this view in the web app.</Text>;
  if (mode === "open") {
    return (
      <Button primary onPress={() => window.location.assign(path)}>
        Open console
      </Button>
    );
  }
  if (nonce === null) return <Text style={s.muted}>This view is not available.</Text>;
  return <EmbedFrame path={path} title={surface.title} nonce={nonce} />;
}
