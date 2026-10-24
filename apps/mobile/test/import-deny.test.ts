import assert from "node:assert/strict";
import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  declaredPackages,
  deniedImports,
  isDeniedImport,
  packageName,
  sourceFiles,
  undeclaredImports,
} from "../../../scripts/check-patch-surface.mjs";

const mobile = resolve(dirname(fileURLToPath(import.meta.url)), "..");

type Hit = { path: string; line: number; specifier: string };

test("the committed tree imports none of the denied libraries", () => {
  const repo = resolve(mobile, "..", "..");
  assert.deepEqual(deniedImports(sourceFiles(repo)), []);
});

const DENIED = ["@radix-ui/react-dialog", "radix-ui", "tailwindcss", "next-themes", "lucide-react"];

test("a fixture file with each denied specifier fails in a temporary copy of the tree", () => {
  const base = mkdtempSync(join(tmpdir(), "import-deny-"));
  try {
    cpSync(join(mobile, "src"), join(base, "apps", "mobile", "src"), { recursive: true });
    cpSync(join(mobile, "App.tsx"), join(base, "apps", "mobile", "App.tsx"));
    assert.deepEqual(deniedImports(sourceFiles(base)), []);
    for (const specifier of DENIED) {
      const fixture = join(base, "apps", "mobile", "src", "fixture-deny.ts");
      writeFileSync(fixture, `import "${specifier}";\n`);
      const hits: Hit[] = deniedImports(sourceFiles(base));
      assert.equal(hits.length, 1, specifier);
      assert.equal(hits[0]?.specifier, specifier);
      assert.equal(hits[0]?.path, "apps/mobile/src/fixture-deny.ts");
      rmSync(fixture);
    }
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("every import form is caught", () => {
  for (const text of [
    'import x from "next-themes";',
    'import { a } from "lucide-react";',
    'export * from "tailwindcss";',
    'const m = require("radix-ui");',
    'const m = await import("@radix-ui/react-tabs");',
    "import y from 'next-themes/dist';",
  ]) {
    assert.equal(deniedImports([{ path: "x.ts", text }]).length, 1, text);
  }
});

test("lucide-react-native and other libraries still pass", () => {
  for (const specifier of [
    "lucide-react-native",
    "react-native",
    "zod",
    "./ui",
    "tailwindcss-like-name",
  ]) {
    assert.equal(isDeniedImport(specifier), false, specifier);
  }
  assert.deepEqual(
    deniedImports([{ path: "x.tsx", text: 'import { Bell } from "lucide-react-native";' }]),
    [],
  );
});

test("an import of a package that is not a declared dependency is flagged, whatever its name", () => {
  const declared = declaredPackages(resolve(mobile, "..", ".."));
  assert.ok(declared.has("lucide-react-native"));
  const line = (text: string) => [{ path: "apps/mobile/src/x.ts", line: 1, text }];
  for (const specifier of [
    "@scope/internal-widgets",
    "@scope/internal-widgets/deep",
    "some-registry-only-package",
    "not-declared/sub/path",
  ]) {
    assert.equal(
      undeclaredImports(line(`import x from "${specifier}";`), declared).length,
      1,
      specifier,
    );
    assert.equal(
      undeclaredImports(line(`const x = require("${specifier}");`), declared).length,
      1,
      specifier,
    );
  }
  for (const specifier of [
    "react",
    "react-native",
    "lucide-react-native",
    "zod",
    "./local",
    "../../../packages/domain/src",
    "node:path",
    "@copilotkit/react-native",
  ]) {
    assert.deepEqual(
      undeclaredImports(line(`import x from "${specifier}";`), declared),
      [],
      specifier,
    );
  }
  assert.equal(packageName("@scope/a/b"), "@scope/a");
  assert.equal(packageName("plain/sub"), "plain");
  assert.equal(packageName("./x"), null);
});
