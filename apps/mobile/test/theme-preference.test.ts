import assert from "node:assert/strict";
import { test } from "node:test";
import { createPreferenceStorage, THEME_CHOICE_KEY } from "../src/theme/preference-storage-core";

test("appearance choice survives creation of a fresh storage adapter", async () => {
  const data = new Map<string, string>();
  const strings = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
  };
  for (const choice of ["dark", "light", "system"] as const) {
    await createPreferenceStorage(strings).save(choice);
    assert.equal(await createPreferenceStorage(strings).load(), choice);
  }
  data.set(THEME_CHOICE_KEY, "corrupt");
  assert.equal(await createPreferenceStorage(strings).load(), null);
});
