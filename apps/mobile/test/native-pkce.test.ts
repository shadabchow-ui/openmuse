import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { test } from "node:test";
import { base64url, challengeFor, createPkce } from "../src/native/pkce";

const SHAPE = /^[A-Za-z0-9_-]+$/;

const sha256 = async (data: string): Promise<Uint8Array> =>
  new Uint8Array(createHash("sha256").update(data, "ascii").digest());

const nodeDeps = {
  random: (n: number) => new Uint8Array(randomBytes(n)),
  sha256,
};

test("RFC 7636 appendix B vector", async () => {
  const challenge = await challengeFor("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk", sha256);
  assert.equal(challenge, "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
});

test("verifier, challenge and state have the required lengths", async () => {
  const pair = await createPkce(nodeDeps);
  assert.equal(pair.verifier.length, 43);
  assert.equal(pair.challenge.length, 43);
  assert.equal(pair.state.length, 32);
});

test("outputs use the base64url alphabet", async () => {
  const pair = await createPkce(nodeDeps);
  assert.match(pair.verifier, SHAPE);
  assert.match(pair.challenge, SHAPE);
  assert.match(pair.state, SHAPE);
});

test("two calls differ", async () => {
  const first = await createPkce(nodeDeps);
  const second = await createPkce(nodeDeps);
  assert.notEqual(first.verifier, second.verifier);
  assert.notEqual(first.state, second.state);
});

test("random is called with 32 then 24 bytes", async () => {
  const sizes: number[] = [];
  await createPkce({
    random: (n: number) => {
      sizes.push(n);
      return new Uint8Array(n);
    },
    sha256,
  });
  assert.deepEqual(sizes, [32, 24]);
});

test("an all-zero random source still yields valid shapes", async () => {
  const pair = await createPkce({ random: (n: number) => new Uint8Array(n), sha256 });
  assert.equal(pair.verifier.length, 43);
  assert.equal(pair.challenge.length, 43);
  assert.equal(pair.state.length, 32);
  assert.match(pair.verifier, SHAPE);
});

test("base64url has no padding and handles remainders", () => {
  assert.equal(base64url(new Uint8Array([102, 111, 111])), "Zm9v");
  assert.equal(base64url(new Uint8Array([102, 111])), "Zm8");
  assert.equal(base64url(new Uint8Array([102])), "Zg");
  assert.equal(base64url(new Uint8Array([])), "");
});
