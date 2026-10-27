import { createPreferenceStorage } from "./preference-storage-core";
import type { ThemeChoiceStorage } from "./theme";
export const defaultPreferenceStorage: ThemeChoiceStorage = {
  async load() {
    try {
      return await createPreferenceStorage(globalThis.localStorage).load();
    } catch {
      return null;
    }
  },
  async save(choice) {
    try {
      await createPreferenceStorage(globalThis.localStorage).save(choice);
    } catch {
      /* Storage can be unavailable in private contexts. */
    }
  },
};
