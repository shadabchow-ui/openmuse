import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const mobile = join(dirname(fileURLToPath(import.meta.url)), "..");

function sources(): Array<{ file: string; text: string }> {
  const files = [
    join(mobile, "App.tsx"),
    ...readdirSync(join(mobile, "src"))
      .filter((name) => /\.(ts|tsx)$/.test(name))
      .map((name) => join(mobile, "src", name)),
  ];
  return files.map((file) => ({
    file: file.slice(mobile.length + 1),
    text: readFileSync(file, "utf8"),
  }));
}

/** Every template literal that starts a URL from the API base must map its path through `apiPath`. */
function handBuiltUrls(text: string): string[] {
  const hits: string[] = [];
  for (const match of text.matchAll(/\$\{API_URL\}(?!\$\{apiPath\()/g)) {
    hits.push(text.slice(match.index, (match.index ?? 0) + 40).split("\n")[0] ?? "");
  }
  for (const match of text.matchAll(/\bAPI_URL\s*\+/g))
    hits.push(text.slice(match.index, (match.index ?? 0) + 40));
  return hits;
}

test("no file builds an API URL without apiPath", () => {
  const offenders = sources().flatMap(({ file, text }) =>
    handBuiltUrls(text).map((hit) => `${file}: ${hit}`),
  );
  assert.deepEqual(offenders, []);
});

test("the three known URL-building sites are all present and mapped", () => {
  const all = sources();
  const count = (needle: RegExp) =>
    all.reduce((sum, { text }) => sum + (text.match(needle)?.length ?? 0), 0);
  assert.ok(count(/\$\{API_URL\}\$\{apiPath\(/g) >= 3);
});

test("the detector flags a hand-built URL", () => {
  const base = ["$", "{API_URL}"].join("");
  const mapped = ["$", "{apiPath('/api/files')}"].join("");
  assert.equal(handBuiltUrls(`fetch(\`${base}/api/files\`)`).length, 1);
  assert.deepEqual(handBuiltUrls(`fetch(\`${base}${mapped}\`)`), []);
  assert.equal(handBuiltUrls("API_URL + '/api/x'").length, 1);
  assert.deepEqual(handBuiltUrls("<Text>at {API_URL}.</Text>"), []);
});
