#!/usr/bin/env node
// DS-05 guard: no literal colour outside the theme.
// Fails on any #hex, rgb(, rgba(, hsl(, hsla( or CSS named colour in
// apps/mobile/src/** except the theme dir (generated tokens, artwork and
// the deprecated alias live there) and functional values (transparent,
// currentcolor). Exit codes: 0 clean, 1 hit.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(root, "apps", "mobile", "src");
const SKIP_DIRS = ["theme"];

const NAMED = new Set(
  "aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen".split(
    " ",
  ),
);

const HEX_RE = /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?(?:[0-9a-fA-F]{2})?\b/;
const FN_RE = /\b(?:rgb|rgba|hsl|hsla)\s*\(/;
const WORD_RE = /\b([a-z]{3,20})\b/g;

function scanFile(path) {
  const hits = [];
  const lines = readFileSync(path, "utf8").split("\n");
  lines.forEach((line, i) => {
    if (/^\s*import\b/.test(line)) return;
    const m = line.match(HEX_RE);
    if (m) {
      hits.push(`${path}:${i + 1}: hex literal ${m[0]}`);
      return;
    }
    const f = line.match(FN_RE);
    if (f) {
      hits.push(`${path}:${i + 1}: colour function ${f[0].trim()}`);
      return;
    }
    WORD_RE.lastIndex = 0;
    for (let w = WORD_RE.exec(line); w !== null; w = WORD_RE.exec(line)) {
      if (NAMED.has(w[1].toLowerCase())) {
        hits.push(`${path}:${i + 1}: named colour ${w[1]}`);
        break;
      }
    }
  });
  return hits;
}

const hits = [];
function walk(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) {
      const rel = relative(SRC, p).split(sep)[0];
      if (!SKIP_DIRS.includes(rel)) walk(p);
    } else if (/\.(tsx?|jsx?|css)$/.test(e)) {
      hits.push(
        ...scanFile(p).map((h) => relative(root, p).split(sep).join("/") + h.slice(h.indexOf(":"))),
      );
    }
  }
}

walk(SRC);
if (hits.length) {
  console.log(`${hits.length} literal colour(s) outside apps/mobile/src/theme/:`);
  for (const h of hits.slice(0, 30)) console.log(`  ${h}`);
  process.exit(1);
}
console.log("check-theme-literals: clean");
