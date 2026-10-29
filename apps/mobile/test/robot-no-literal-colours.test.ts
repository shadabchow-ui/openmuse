import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const src = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "robot");
const NAMED = new Set(
  "aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen".split(
    " ",
  ),
);
const ALLOW_FUNCTIONAL = new Set(["transparent", "none", "currentcolor"]);

export function scanColors(text: string): string[] {
  const hits: string[] = [];
  text.split("\n").forEach((line, index) => {
    if (/^\s*import\b/.test(line)) return;
    const hex = line.match(/#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?(?:[0-9a-fA-F]{2})?\b/);
    if (hex) {
      hits.push(`${index + 1}: ${hex[0]}`);
      return;
    }
    const fn = line.match(/\b(?:rgb|rgba|hsl|hsla)\s*\(/);
    if (fn) {
      hits.push(`${index + 1}: ${fn[0]}`);
      return;
    }
    for (const word of line.matchAll(/\b([a-z]{3,20})\b/g)) {
      const value = word[1]!.toLowerCase();
      if (NAMED.has(value) && !ALLOW_FUNCTIONAL.has(value)) {
        hits.push(`${index + 1}: ${value}`);
        break;
      }
    }
  });
  return hits;
}

test("no literal colour is used by the new robot screens", () => {
  for (const file of readdirSync(src).filter((name) => /\.(ts|tsx)$/.test(name))) {
    assert.deepEqual(scanColors(readFileSync(join(src, file), "utf8")), [], file);
  }
});

test("the scanner fails a planted literal", () => {
  assert.deepEqual(scanColors('const style = { color: "#fff" };'), ["1: #fff"]);
  assert.deepEqual(scanColors("style={{ backgroundColor: rgb(1, 2, 3) }}"), ["1: rgb("]);
  assert.deepEqual(scanColors("style={{ color: transparent }}"), []);
});
