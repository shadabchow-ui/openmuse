import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { checkBundle, main } from "../../../scripts/check-bundle-config.mjs";

const PREFIX = "/api/gateway";

function exportDir(js: string | null) {
  const dir = mkdtempSync(join(tmpdir(), "bundle-"));
  const bundle = join(dir, "_expo", "static", "js", "web");
  mkdirSync(bundle, { recursive: true });
  if (js !== null) writeFileSync(join(bundle, "index-abc.js"), js);
  return dir;
}

test("an external export that carries the prefix passes, and one that does not fails", () => {
  const good = exportDir(`fetch("${PREFIX}/session")`);
  const wrong = exportDir('fetch("/api/session")');
  try {
    assert.equal(checkBundle(good, "external", PREFIX).ok, true);
    assert.equal(checkBundle(wrong, "external", PREFIX).ok, false);
  } finally {
    rmSync(good, { recursive: true, force: true });
    rmSync(wrong, { recursive: true, force: true });
  }
});

test("a default bundle shipped as external mode is caught in both directions", () => {
  const defaultBundle = exportDir('fetch("/api/session")');
  const externalBundle = exportDir(`fetch("${PREFIX}/session")`);
  try {
    assert.equal(checkBundle(defaultBundle, "default", PREFIX).ok, true);
    assert.equal(checkBundle(externalBundle, "default", PREFIX).ok, false);
    assert.equal(main([defaultBundle, "external", PREFIX]), 1);
    assert.equal(main([externalBundle, "external", PREFIX]), 0);
    assert.equal(main([externalBundle, "default", PREFIX]), 1);
  } finally {
    rmSync(defaultBundle, { recursive: true, force: true });
    rmSync(externalBundle, { recursive: true, force: true });
  }
});

test("an empty or missing export fails, and bad usage is refused", () => {
  const empty = exportDir(null);
  try {
    assert.equal(checkBundle(empty, "default", PREFIX).ok, false);
    assert.equal(checkBundle(join(empty, "missing"), "external", PREFIX).ok, false);
  } finally {
    rmSync(empty, { recursive: true, force: true });
  }
  assert.equal(main([]), 2);
  assert.equal(main(["dir", "other", PREFIX]), 2);
  assert.equal(main(["dir", "external", "no-slash"]), 2);
});
