import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const src = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "robot");

function exportNames(source: string): string[] {
  const names = new Set<string>();
  for (const match of source.matchAll(
    /export\s+(?:async\s+)?(?:function|const|class|type|interface)\s+([A-Za-z0-9_]+)/g,
  )) {
    names.add(match[1]!);
  }
  for (const match of source.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of match[1]!.split(",")) {
      const name = part
        .trim()
        .split(/\s+as\s+/)
        .pop()!
        .trim();
      if (name) names.add(name);
    }
  }
  return [...names].sort();
}

const names = readdirSync(src);
const nativeFiles = names.filter((name) => /\.native\.ts$/.test(name));

test("every native shim has a web sibling with equal exports", () => {
  assert.ok(nativeFiles.length >= 3);
  for (const file of nativeFiles) {
    const sibling = file.replace(/\.native\.ts$/, ".web.ts");
    assert.ok(names.includes(sibling), `missing ${sibling}`);
    assert.deepEqual(
      exportNames(readFileSync(join(src, sibling), "utf8")),
      exportNames(readFileSync(join(src, file), "utf8")),
      file,
    );
  }
});

test("native-only platform modules are imported only by the native shims", () => {
  for (const name of names.filter((entry) => /\.(ts|tsx)$/.test(entry))) {
    if (/\.native\.tsx?$/.test(name)) continue;
    const text = readFileSync(join(src, name), "utf8");
    assert.doesNotMatch(text, /from "expo-web-browser"/, name);
  }
});
