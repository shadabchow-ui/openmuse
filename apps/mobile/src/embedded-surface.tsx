import { createElement } from "react";
import { Platform, Text, View } from "react-native";
import type { RuntimeSurface } from "../../../packages/domain/src/muse-contract";
import { apiConfig } from "./api-config";
import { SURFACE_SANDBOX, safeSurfacePath, surfaceMode } from "./surface-url";
import { Button, s } from "./ui";

/** A backend view. Only listed path prefixes are framed (default: none); a console view is opened, never framed. */
export function EmbeddedSurface({ surface }: { surface: RuntimeSurface }) {
  const mode = surfaceMode(surface, Platform.OS, apiConfig.embedPrefixes);
  const path = safeSurfacePath(surface.path);
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
  return (
    <View style={{ width: "100%", height: 480 }}>
      {createElement("iframe", {
        src: path,
        title: surface.title,
        sandbox: SURFACE_SANDBOX,
        referrerPolicy: "no-referrer",
        style: { width: "100%", height: "100%", border: 0, borderRadius: 12 },
      })}
    </View>
  );
}
