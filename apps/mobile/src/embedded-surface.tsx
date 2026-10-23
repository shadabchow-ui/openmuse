import { createElement } from "react";
import { Platform, Text, View } from "react-native";
import type { RuntimeSurface } from "../../../packages/domain/src/muse-contract";
import { safeSurfacePath } from "./surface-url";
import { Button, s } from "./ui";

/** The iframe may run its own scripts but may not navigate the page, submit forms, open windows or dialogs. */
export const SURFACE_SANDBOX = "allow-scripts allow-same-origin";

/** A same-origin view supplied by the backend. The path is validated here, whatever the caller did. */
export function EmbeddedSurface({ surface }: { surface: RuntimeSurface }) {
  const path = safeSurfacePath(surface.path);
  if (path === null) return <Text style={s.muted}>This view is not available.</Text>;
  if (Platform.OS !== "web") return <Text style={s.muted}>Open this view in the web app.</Text>;
  if (surface.kind === "console") {
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
