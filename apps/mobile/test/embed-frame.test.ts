import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";
import { createElement } from "react";
import { EmbedFrame } from "../src/embed-frame";

// react-dom ships no types here and a dependency may not be added, so it is loaded untyped.
const { renderToStaticMarkup } = createRequire(import.meta.url)("react-dom/server") as {
  renderToStaticMarkup: (element: unknown) => string;
};

const nonce = "0123456789abcdef0123456789abcdef";

function render(path = "/embed/presence?x=1") {
  return renderToStaticMarkup(createElement(EmbedFrame, { path, title: "Presence", nonce }));
}

test("the rendered iframe carries exactly the pinned sandbox and no other permission", () => {
  const html = render();
  assert.match(html, /<iframe /);
  assert.match(html, /sandbox="allow-scripts"/);
  for (const token of [
    "allow-same-origin",
    "allow-top-navigation",
    "allow-forms",
    "allow-popups",
    "allow-modals",
    "allow-downloads",
    "allow-pointer-lock",
    "allow-presentation",
    "allow-orientation-lock",
    "allow-storage-access-by-user-activation",
  ]) {
    assert.ok(!html.includes(token), token);
  }
  assert.match(html, /referrerPolicy="no-referrer"|referrerpolicy="no-referrer"/i);
  assert.match(html, /allow=""/);
});

test("the rendered iframe source is the validated path plus the nonce fragment, once", () => {
  const html = render("/embed/presence?x=1#old");
  assert.equal((html.match(/<iframe /g) ?? []).length, 1);
  assert.match(html, new RegExp(`src="/embed/presence\\?x=1#embed=${nonce}"`));
  assert.ok(!html.includes("#old"));
});
