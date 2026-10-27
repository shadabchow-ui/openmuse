import { readSecureString, writeSecureString } from "../native/token-store";
import type { ThemeChoiceStorage } from "./theme";

const key = "appearance.choice.v1";
/** Existing platform preference-string adapter; no session or credential key is used. */
export const defaultPreferenceStorage: ThemeChoiceStorage = {
  async load() {
    const v = await readSecureString(key);
    return v === "light" || v === "dark" || v === "system" ? v : null;
  },
  async save(choice) {
    await writeSecureString(key, choice);
  },
};
