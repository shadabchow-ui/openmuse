/**
 * DS-05 theme runtime tests: token-driven Light / Dark / System.
 *
 * - The deprecated `colors` alias equals the pre-change palette exactly.
 * - The dark theme carries the DS-01 generated token values (no invented
 *   value in the fork).
 * - `useTheme()` defaults to light with no provider mounted; the provider
 *   resolves an explicit dark choice without any system hooks.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { dark as tokenDark } from "../src/theme/generated/open-muse";
import { colors } from "../src/theme/legacy-colors";
import { ThemeProvider, useTheme } from "../src/theme/ThemeProvider";
import { darkTheme, lightTheme, resolveTheme } from "../src/theme/theme";

test("deprecated alias equals the pre-change palette", () => {
  assert.deepEqual(
    { ...colors },
    {
      canvas: "#FCFCFC",
      card: "#FFFFFF",
      text: "#11191C",
      muted: "#697176",
      line: "#EEEEF0",
      blue: "#C8E7FF",
      blueDark: "#1473C8",
      sky: "#EDF7FD",
      green: "#E3F3E8",
      lavender: "#F0EEFA",
      orange: "#FDF0DF",
      danger: "#AA4A45",
    },
  );
});

test("light theme preserves the fork palette byte-identically", () => {
  assert.equal(lightTheme.background, "#FCFCFC");
  assert.equal(lightTheme.foreground, "#11191C");
  assert.equal(lightTheme.card, "#FFFFFF");
  assert.equal(lightTheme.primary, "#C8E7FF");
  assert.equal(lightTheme.link, "#1473C8");
  assert.equal(lightTheme.border, "#EEEEF0");
  assert.equal(lightTheme.destructive, "#AA4A45");
  assert.equal(lightTheme.scheme, "light");
});

test("dark theme carries the generated token values", () => {
  assert.equal(darkTheme.background, tokenDark.background);
  assert.equal(darkTheme.foreground, tokenDark.foreground);
  assert.equal(darkTheme.card, tokenDark.card);
  assert.equal(darkTheme.primary, tokenDark.primary);
  assert.equal(darkTheme.primaryForeground, tokenDark["primary-foreground"]);
  assert.equal(darkTheme.link, tokenDark.link);
  assert.equal(darkTheme.border, tokenDark.border);
  assert.equal(darkTheme.success, tokenDark.success);
  assert.equal(darkTheme.warning, tokenDark.warning);
  assert.equal(darkTheme.accent, tokenDark.accent);
  assert.equal(darkTheme.destructive, tokenDark.destructive);
  assert.equal(darkTheme.mutedForeground, tokenDark["muted-foreground"]);
  assert.equal(darkTheme.onSuccess, tokenDark["success-foreground"]);
  assert.equal(darkTheme.onWarning, tokenDark["warning-foreground"]);
  assert.equal(darkTheme.onInfo, tokenDark["info-foreground"]);
  assert.equal(darkTheme.onAccent, tokenDark["accent-foreground"]);
  assert.equal(darkTheme.successText, tokenDark.success);
  assert.equal(darkTheme.scheme, "dark");
});

test("on-wash light values preserve the old card text", () => {
  for (const role of [
    lightTheme.onSuccess,
    lightTheme.onWarning,
    lightTheme.onInfo,
    lightTheme.onAccent,
  ] as const) {
    assert.equal(role, "#11191C");
  }
  assert.equal(lightTheme.successText, "#248258");
});

test("resolveTheme follows explicit and system choices", () => {
  assert.deepEqual(resolveTheme("light", "dark"), lightTheme);
  assert.deepEqual(resolveTheme("dark", "light"), darkTheme);
  assert.deepEqual(resolveTheme("system", null), lightTheme);
  assert.deepEqual(resolveTheme("system", "dark"), darkTheme);
});

function Probe() {
  const { theme, scheme, choice } = useTheme();
  return `${choice}:${scheme}:${theme.background}:${theme.foreground}`;
}

test("useTheme defaults to light with no provider mounted", () => {
  const html = renderToString(createElement(Probe));
  assert.ok(html.includes(`system:light:${lightTheme.background}:${lightTheme.foreground}`), html);
});

test("provider resolves an explicit dark choice", () => {
  const html = renderToString(
    // biome-ignore lint/correctness/noChildrenProp: node:test .ts file cannot use JSX; children-in-props is the only render path here.
    createElement(ThemeProvider, { initialChoice: "dark", children: createElement(Probe) }),
  );
  assert.ok(html.includes(`dark:dark:${tokenDark.background}:${tokenDark.foreground}`), html);
});

test("provider resolves an explicit light choice", () => {
  const html = renderToString(
    // biome-ignore lint/correctness/noChildrenProp: node:test .ts file cannot use JSX; children-in-props is the only render path here.
    createElement(ThemeProvider, { initialChoice: "light", children: createElement(Probe) }),
  );
  assert.ok(html.includes(`light:light:${lightTheme.background}:${lightTheme.foreground}`), html);
});

// Preserve the exact legacy alert appearance while mapping dark to existing tokens.
test("error notice preserves light pixels and pairs existing dark tokens", () => {
  assert.equal(lightTheme.errorBackground, "#FBEFED");
  assert.equal(lightTheme.errorForeground, "#AA4A45");
  assert.equal(darkTheme.errorBackground, tokenDark.destructive);
  assert.equal(darkTheme.errorForeground, tokenDark["destructive-foreground"]);
});
