#!/usr/bin/env node
// DS-05 codemod: mechanical part of the static-colors -> theme-roles migration.
//
// What it does per file under apps/mobile/src (excluding src/theme and
// src/ui.tsx, which are converted by hand):
//   1. colors.KEY -> theme.ROLE (uniform map from docs/THEME.md).
//   2. Known static hex literals -> theme.ROLE (map below; artwork values are
//      NOT mapped and are reported MANUAL).
//   3. Inserts `const theme = useTheme();` (and, when the file uses the shared
//      stylesheet, `const s = useMemo(() => makeStyles(theme), [theme]);`)
//      into every component function that references them.
//   4. Fixes imports (drops colors/s from the ./ui import, adds the theme
//      imports and useMemo).
// Anything it cannot place (module-scope use, lowercase helpers, unmapped
// literals, ui.tsx) is printed as MANUAL and left untouched.
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SRC = join(root, "apps", "mobile", "src");

const COLOR_MAP = {
  canvas: "background",
  card: "card",
  text: "foreground",
  muted: "mutedForeground",
  line: "border",
  blue: "primary",
  blueDark: "link",
  sky: "info",
  green: "success",
  lavender: "accent",
  orange: "warning",
  danger: "destructive",
};

// Lower-cased hex (with #) -> theme role. Artwork/brand values are absent by
// design and reported MANUAL.
const LITERAL_MAP = {
  "#fff": "card",
  "#ffffff": "card",
  "#f1f2f3": "secondary",
  "#f0f1f2": "secondary",
  "#f1f3f4": "secondary",
  "#f0eff2": "secondary",
  "#fafafb": "secondary",
  "#f3f5f6": "secondary",
  "#eef0f2": "secondary",
  "#eeeef0": "border",
  "#e2e4e7": "muted",
  "#9cb5c5": "mutedForeground",
  "#949b9f": "mutedForeground",
  "#acb0b5": "mutedForeground",
  "#248258": "successText",
  "#57ad85": "successText",
  "#6aaee0": "link",
  "#fc2359": "destructive",
  "#e9f5fc": "info",
  "#c7e4f9": "ring",
  "#d8dbde": "border",
  "#18384b": "scrim",
  "#fbefed": "destructive",
  "#d9f1e2": "success",
  "#24a46b": "successText",
  "#189a58": "successText",
  "#a7aaac": "mutedForeground",
  "#a3a6a8": "mutedForeground",
  "#d7e9fa": "info",
  "#3d9bde": "link",
  "#989c9f": "mutedForeground",
  "#666a6d": "mutedForeground",
  "#dfe8eb": "secondary",
  "#f4f5f6": "secondary",
  "#e7e9e3": "secondary",
  "#8db6ca": "link",
  "#edefea": "secondary",
  "#dde3dd": "border",
  "#a4bed0": "muted",
  "#e3e7e3": "muted",
  "#f3f4f5": "secondary",
  "#e5e7e9": "border",
  "#a4a7aa": "mutedForeground",
};

const SKIP_FILES = new Set(["apps/mobile/src/ui.tsx"]);
const SKIP_DIRS = ["apps/mobile/src/theme/"];
const BT = String.fromCharCode(96);

// Split uses handled by hand: matched lines keep colors.* for the manual
// pass and are reported.
const MANUAL_LINES = [{ file: "chat.tsx", sub: "user ? colors.blue" }];

function manualLine(file, line) {
  return MANUAL_LINES.some((m) => file.endsWith(m.file) && line.includes(m.sub));
}

// Mask strings/comments/template literals (with ${} nesting) for brace scan.
function mask(text) {
  let out = "";
  let i = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    if (c === "/" && text[i + 1] === "/") {
      const j = text.indexOf("\n", i);
      const end = j === -1 ? n : j;
      out += " ".repeat(end - i);
      i = end;
    } else if (c === "/" && text[i + 1] === "*") {
      const j = text.indexOf("*/", i + 2);
      const end = j === -1 ? n : j + 2;
      let pad = "";
      for (let k = i; k < end; k++) pad += text[k] === "\n" ? "\n" : " ";
      out += pad;
      i = end;
    } else if (c === "'" || c === '"' || c === BT) {
      const quote = c;
      let j = i + 1;
      let depth = 0;
      let chunk = c;
      while (j < n) {
        if (quote === BT && text[j] === "$" && text[j + 1] === "{") {
          depth++;
          chunk += "${";
          j += 2;
          continue;
        }
        if (quote === BT && depth > 0 && text[j] === "}") {
          depth--;
          chunk += "}";
          j++;
          continue;
        }
        if (depth === 0 && text[j] === quote) {
          chunk += quote;
          j++;
          break;
        }
        if (text[j] === "\\") {
          chunk += text.slice(j, j + 2);
          j += 2;
          continue;
        }
        chunk += text[j];
        j++;
      }
      out += chunk.replace(/[^\n]/g, " ");
      i = j;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

const FN_SIG =
  /^\s*(export\s+)?(default\s+)?(async\s+)?function\s+[A-Za-z_$][\w$]*|^\s*(export\s+)?const\s+[A-Za-z_$][\w$]*\s*=\s*(\([^)]*\)\s*=>|function\b|.*=>\s*$)/;

function convertFile(rel, text) {
  const lines = text.split("\n");
  const masked = mask(text).split("\n");
  const depthAfter = [];
  const parenAfter = [];
  let depth = 0;
  let paren = 0;
  for (const ml of masked) {
    for (const ch of ml) {
      if (ch === "{") depth++;
      else if (ch === "}") depth = Math.max(0, depth - 1);
      else if (ch === "(") paren++;
      else if (ch === ")") paren = Math.max(0, paren - 1);
    }
    depthAfter.push(depth);
    parenAfter.push(paren);
  }
  const manual = [];
  const out = [...lines];
  const changed = { colors: 0, literals: 0, hooks: [] };

  for (let i = 0; i < out.length; i++) {
    if (/^\s*import\b/.test(out[i])) continue;
    const orig = lines[i];
    let line = out[i];
    line = line.replace(/\bcolors\.([A-Za-z]+)/g, (m, k) => {
      if (!(k in COLOR_MAP)) {
        manual.push(rel + ":" + (i + 1) + ": unknown colors key " + k);
        return m;
      }
      if (manualLine(rel, orig)) return m;
      changed.colors++;
      return "theme." + COLOR_MAP[k];
    });
    out[i] = line.replace(/#[0-9A-Fa-f]{3,8}\b/g, (m) => {
      const role = LITERAL_MAP[m.toLowerCase()];
      if (!role) {
        manual.push(rel + ":" + (i + 1) + ": unmapped literal " + m);
        return m;
      }
      changed.literals++;
      return "theme." + role;
    });
  }

  const needsTheme = out.some((l) => !/^\s*import\b/.test(l) && /\btheme\./.test(l));
  const needsStyles = out.some((l) => /\bs\./.test(l));
  if (!needsTheme && !needsStyles) return { changed: false, manual };

  const usageLines = [];
  out.forEach((l, i) => {
    if (/^\s*import\b/.test(l)) return;
    if (needsStyles && /\bs\./.test(l)) usageLines.push(i);
    else if (/\btheme\./.test(l)) usageLines.push(i);
  });

  const depthAt = (idx) => (idx === 0 ? 0 : depthAfter[idx - 1]);
  const hostFns = new Map();
  for (const u of usageLines) {
    const d = depthAt(u);
    if (d === 0) {
      manual.push(rel + ":" + (u + 1) + ": module-scope theme/styles use");
      continue;
    }
    let host = -1;
    for (let j = u; j >= 0; j--) {
      if (FN_SIG.test(masked[j]) && depthAt(j) < d) {
        host = j;
        break;
      }
    }
    if (host === -1) {
      manual.push(rel + ":" + (u + 1) + ": no enclosing function found");
      continue;
    }
    if (!hostFns.has(host)) hostFns.set(host, []);
    hostFns.get(host).push(u);
  }

  const hosts = [...hostFns.keys()].sort((a, b) => b - a);
  for (const h of hosts) {
    const body = out.slice(h, h + 12).join("\n");
    const nm = body.match(/function\s+([A-Za-z_$][\w$]*)|const\s+([A-Za-z_$][\w$]*)\s*=/) || [];
    const name = nm[1] || nm[2] || "anonymous";
    if (!/^[A-Z]/.test(name)) {
      for (const u of hostFns.get(h)) manual.push(rel + ":" + (u + 1) + ": use inside non-component " + name);
      continue;
    }
    const base = depthAt(h);
    const parenBase = h === 0 ? 0 : parenAfter[h - 1];
    let open = -1;
    for (let j = h; j < out.length; j++) {
      if (depthAfter[j] > base && parenAfter[j] === parenBase) {
        open = j;
        break;
      }
    }
    if (open === -1) {
      manual.push(rel + ":" + (h + 1) + ": cannot find body of " + name);
      continue;
    }
    const indent = (out[open].match(/^\s*/) || [""])[0] + "  ";
    const insert = [];
    if (!/const\s+theme\s*=\s*useTheme\(\)/.test(body)) insert.push(indent + "const theme = useTheme();");
    if (needsStyles && !/makeStyles\(theme\)/.test(body))
      insert.push(indent + "const s = useMemo(() => makeStyles(theme), [theme]);");
    if (insert.length) {
      out.splice(open + 1, 0, ...insert);
      changed.hooks.push(name + ":" + (open + 2));
    }
  }

  const uiPrefix = rel.includes("/native/") ? "../ui" : "./ui";
  let text2 = out.join("\n");
  const uiImport = new RegExp("import\\s*\\{([^}]*)\\}\\s*from\\s*[\"']" + uiPrefix.replace(/\//g, "\\/") + "[\"'];?");
  const m = text2.match(uiImport);
  if (m) {
    let names = m[1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    names = names.filter((n) => n !== "colors" && n !== "s");
    if (needsTheme || needsStyles) {
      if (!names.includes("useTheme")) names.push("useTheme");
      if (needsStyles && !names.includes("makeStyles")) names.push("makeStyles");
    }
    text2 = text2.replace(uiImport, 'import { ' + names.join(", ") + ' } from "' + uiPrefix + '";');
  }
  // Unquote stringified role refs produced when a literal sat inside quotes.
  // JSX prop position (prop="lit") needs braces; style-object position needs
  // the bare reference.
  text2 = text2.replace(/(=\s*)(["'])theme\.([A-Za-z]+)\2/g, "$1{theme.$3}");
  text2 = text2.replace(/(["'])theme\.([A-Za-z]+)\1/g, "theme.$2");
  const reactLine = text2.split("\n").find((l) => /from\s*["']react["']/.test(l)) || "";
  if (needsStyles && !/useMemo/.test(reactLine)) {
    text2 = text2.replace(/import\s*\{([^}]*)\}\s*from\s*["']react["'];?/, (mm, nn) => {
      const ns = nn
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (!ns.includes("useMemo")) ns.push("useMemo");
      return 'import { ' + ns.join(", ") + ' } from "react";';
    });
  }
  return { changed: true, text: text2, manual, stats: changed };
}

const files = [];
function walk(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) {
      const rel = relative(root, p).split(sep).join("/") + "/";
      if (!SKIP_DIRS.some((d) => rel === d || rel.startsWith(d))) walk(p);
    } else if (/\.(tsx?|jsx?)$/.test(e)) {
      const rel = relative(root, p).split(sep).join("/");
      if (!SKIP_FILES.has(rel) && !SKIP_DIRS.some((d) => rel.startsWith(d))) files.push(p);
    }
  }
}

const allManual = [];
let converted = 0;
walk(SRC);
for (const p of files.sort()) {
  const rel = relative(root, p).split(sep).join("/");
  const text = readFileSync(p, "utf8");
  if (!/\bcolors\./.test(text) && !/\bs\./.test(text) && !/["']theme\./.test(text)) continue;
  const r = convertFile(rel, text);
  allManual.push(...r.manual);
  if (r.changed && r.text && r.text !== text) {
    writeFileSync(p, r.text);
    converted++;
    console.log("CONVERTED " + rel + " colors=" + r.stats.colors + " literals=" + r.stats.literals + " hooks=[" + r.stats.hooks.join(", ") + "]");
  }
}
console.log("");
console.log("files converted: " + converted);
console.log("MANUAL items:");
for (const x of allManual) console.log("  " + x);
