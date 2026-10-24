import assert from "node:assert/strict";
import { test } from "node:test";
import type { Workspace } from "../../../packages/domain/src";
import { brandName, hasCustomBrand } from "../src/brand";

const runtime = (brand?: { name: string }): Workspace["runtime"] => ({
  provider: "model",
  configured: true,
  openbotConfigured: false,
  ...(brand ? { brand } : {}),
});

test("runtime brand wins, then the build setting, then the upstream name", () => {
  assert.equal(
    brandName(runtime({ name: "From Runtime" }), { brandName: "From Build" }),
    "From Runtime",
  );
  assert.equal(brandName(runtime(), { brandName: "From Build" }), "From Build");
  assert.equal(brandName(undefined, { brandName: "From Build" }), "From Build");
  assert.equal(brandName(runtime(), { brandName: undefined }), "OpenMuse");
  assert.equal(brandName(undefined, { brandName: undefined }), "OpenMuse");
});

test("a blank runtime brand name is ignored", () => {
  assert.equal(brandName(runtime({ name: "   " }), { brandName: undefined }), "OpenMuse");
  assert.equal(hasCustomBrand(runtime({ name: " " }), { brandName: undefined }), false);
});

test("hasCustomBrand is true for either source", () => {
  assert.equal(hasCustomBrand(runtime({ name: "X" }), { brandName: undefined }), true);
  assert.equal(hasCustomBrand(undefined, { brandName: "X" }), true);
  assert.equal(hasCustomBrand(undefined, { brandName: undefined }), false);
});
