import type { ThemeChoice, ThemeChoiceStorage } from "./theme";
export const THEME_CHOICE_KEY = "appearance.choice.v1";
export interface PreferenceStrings {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export function createPreferenceStorage(strings: PreferenceStrings): ThemeChoiceStorage {
  return {
    async load() {
      const v = strings.getItem(THEME_CHOICE_KEY);
      return v === "light" || v === "dark" || v === "system" ? v : null;
    },
    async save(choice: ThemeChoice) {
      strings.setItem(THEME_CHOICE_KEY, choice);
    },
  };
}
