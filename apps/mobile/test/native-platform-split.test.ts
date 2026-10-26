import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const srcDir = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "native");

const NATIVE_ONLY_MODULES = [
  "expo-secure-store",
  "expo-web-browser",
  "expo-notifications",
  "expo-local-authentication",
  "expo-device",
  "@react-native-community/netinfo",
];

function exportNames(source: string): string[] {
  const names = new Set<string>();
  for (const match of source.matchAll(/export\s+(?:async\s+)?(?:function|const|class|type|interface)\s+([A-Za-z0-9_]+)/g)) {
    names.add(match[1]!);
  }
  for (const match of source.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of match[1]!.split(",")) {
      const name = part.trim().split(/\s+as\s+/).pop()!.trim();
      if (name) names.add(name);
    }
  }
  return [...names].sort();
}

function nativeFiles(): string[] {
  return readdirSync(srcDir).filter((f) => f.endsWith(".native.ts") || f.endsWith(".native.tsx"));
}

test("every native shim has a web sibling", () => {
  const files = nativeFiles();
  assert.ok(files.length > 0, "expected native shims");
  for (const file of files) {
    const sibling = file.replace(/\.native(\.tsx?)$/, ".web$1");
    assert.ok(
      readdirSync(srcDir).includes(sibling),
      `missing web sibling for ${file}`,
    );
  }
});

test("native and web siblings export the same names", () => {
  for (const file of nativeFiles()) {
    const sibling = file.replace(/\.native(\.tsx?)$/, ".web$1");
    const nativeExports = exportNames(readFileSync(join(srcDir, file), "utf8"));
    const webExports = exportNames(readFileSync(join(srcDir, sibling), "utf8"));
    assert.deepEqual(webExports, nativeExports, sibling);
  }
});

test("native-only modules are imported only by native shims", () => {
  const offenders: string[] = [];
  const walk = (dir: string): string[] => {
    const out: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules") continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) out.push(...walk(path));
      else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith(".test.ts")) out.push(path);
    }
    return out;
  };
  const mobileSrc = join(dirname(fileURLToPath(import.meta.url)), "..");
  for (const path of walk(mobileSrc)) {
    const relative = path.slice(mobileSrc.length + 1).replace(/\\/g, "/");
    if (/^src\/native\/[^/]*\.native\.tsx?$/.test(relative)) continue;
    const source = readFileSync(path, "utf8");
    for (const module of NATIVE_ONLY_MODULES) {
      const pattern = new RegExp(`from\\s*["']${module.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\/.*)?["']`);
      if (pattern.test(source)) offenders.push(`${relative} imports ${module}`);
    }
  }
  assert.deepEqual(offenders, []);
});
