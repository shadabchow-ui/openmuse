#!/usr/bin/env node
// Asserts that a web export was built with the configuration it is supposed to carry.
//
//   node scripts/check-bundle-config.mjs <export-dir> default|external <api-prefix>
//
// external: the JS bundle must contain the configured API prefix.
// default:  the JS bundle must not contain it.
// A build cache can make a second export reuse the first one's inlined settings, so a green export step alone
// does not show which configuration was built. Exit codes: 0 as expected, 1 not as expected, 2 bad usage.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** All `.js` files under `dir`, recursively. */
export function bundleFiles(dir) {
  const out = [];
  const walk = (current) => {
    for (const name of readdirSync(current)) {
      const full = join(current, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith(".js")) out.push(full);
    }
  };
  if (existsSync(dir)) walk(dir);
  return out;
}

/** @returns {{ok: boolean, message: string}} */
export function checkBundle(dir, mode, prefix) {
  const files = bundleFiles(dir);
  if (files.length === 0) return { ok: false, message: `no JavaScript bundle found under ${dir}` };
  const present = files.some((file) => readFileSync(file, "utf8").includes(prefix));
  if (mode === "external") {
    return present
      ? { ok: true, message: `external bundle carries ${prefix}` }
      : {
          ok: false,
          message: `external bundle does not contain ${prefix}: the default configuration may have been built`,
        };
  }
  return present
    ? {
        ok: false,
        message: `default bundle contains ${prefix}: the external configuration may have been built`,
      }
    : { ok: true, message: `default bundle does not carry ${prefix}` };
}

export function main(argv) {
  const [dir, mode, prefix] = argv;
  if (!dir || !["default", "external"].includes(mode) || !prefix?.startsWith("/")) {
    console.error("usage: check-bundle-config.mjs <export-dir> default|external </api-prefix>");
    return 2;
  }
  const result = checkBundle(resolve(dir), mode, prefix);
  console.log(result.message);
  return result.ok ? 0 : 1;
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
