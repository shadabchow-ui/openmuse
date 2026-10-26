import assert from "node:assert/strict";
import { test } from "node:test";
import {
  darkTheme,
  lightTheme,
  loadThemeChoice,
  MemoryThemeChoiceStorage,
  resolveTheme,
  saveThemeChoice,
} from "../src/theme/theme";

test("light and dark themes expose identical keys", () => {
  assert.deepEqual(Object.keys(darkTheme).sort(), Object.keys(lightTheme).sort());
});

test("light theme carries the fork colors without changing appearance", () => {
  assert.equal(lightTheme.background, "#FCFCFC");
  assert.equal(lightTheme.foreground, "#11191C");
  assert.equal(lightTheme.card, "#FFFFFF");
  assert.equal(lightTheme.primary, "#C8E7FF");
  assert.equal(lightTheme.destructive, "#AA4A45");
  assert.equal(lightTheme.border, "#EEEEF0");
});

test("resolveTheme follows an explicit choice", () => {
  assert.deepEqual(resolveTheme("light", "dark"), lightTheme);
  assert.deepEqual(resolveTheme("dark", "light"), darkTheme);
});

test("resolveTheme falls back to light when Appearance is unavailable", () => {
  assert.deepEqual(resolveTheme("system", null), lightTheme);
  assert.deepEqual(resolveTheme("system", "dark"), darkTheme);
  assert.deepEqual(resolveTheme("system", "light"), lightTheme);
});

test("theme choice round-trips through storage", async () => {
  const storage = new MemoryThemeChoiceStorage();
  assert.equal(await loadThemeChoice(storage), "system");
  await saveThemeChoice(storage, "dark");
  assert.equal(await loadThemeChoice(storage), "dark");
});

test("a failing store still resolves to system", async () => {
  const broken = {
    load: async (): Promise<null> => {
      throw new Error("gone");
    },
    save: async (): Promise<void> => {},
  };
  assert.equal(await loadThemeChoice(broken), "system");
});
