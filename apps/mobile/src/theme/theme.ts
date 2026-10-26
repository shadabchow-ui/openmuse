/** Native theme tokens in the shape the generated DS-01 output will have.
 *
 * Light values map the fork's current `colors` (plus `s.secondary`'s exact
 * background, recorded below) to roles. Dark repeats the light values until
 * DS-05 supplies dark values. Nothing here changes the app's appearance.
 */

declare const require:
  | undefined
  | ((id: string) => { useColorScheme: () => "light" | "dark" | null | undefined });

export interface ThemeRoles {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  success: string;
  successForeground: string;
  warning: string;
  warningForeground: string;
  border: string;
  input: string;
  ring: string;
  link: string;
}

export interface ThemeScale {
  radius: { sm: number; md: number; lg: number; xl: number };
  space: { xs: number; sm: number; md: number; lg: number; xl: number };
}

export const scale: ThemeScale = {
  radius: { sm: 10, md: 14, lg: 20, xl: 24 },
  space: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
};

const TEXT = "#11191C";
const PAPER = "#FFFFFF";

export const lightTheme: ThemeRoles = {
  background: "#FCFCFC", // colors.canvas
  foreground: TEXT, // colors.text
  card: PAPER, // colors.card
  cardForeground: TEXT,
  popover: PAPER,
  popoverForeground: TEXT,
  primary: "#C8E7FF", // colors.blue (s.primary background; labels use text)
  primaryForeground: TEXT,
  // colors has no secondary surface: exact s.secondary background, recorded, no visual change.
  secondary: "#F1F2F3",
  secondaryForeground: TEXT,
  muted: "#697176", // colors.muted
  mutedForeground: PAPER,
  accent: "#1473C8", // colors.blueDark
  accentForeground: PAPER,
  destructive: "#AA4A45", // colors.danger
  destructiveForeground: PAPER,
  success: "#E3F3E8", // colors.green
  successForeground: TEXT,
  warning: "#FDF0DF", // colors.orange
  warningForeground: TEXT,
  border: "#EEEEF0", // colors.line
  input: "#EEEEF0", // colors.line
  ring: "#1473C8", // colors.blueDark
  link: "#1473C8", // colors.blueDark
};

/** DS-05 supplies the dark values; until then dark repeats light. */
export const darkTheme: ThemeRoles = { ...lightTheme };

export type ThemeChoice = "light" | "dark" | "system";

export function resolveTheme(choice: ThemeChoice, system: "light" | "dark" | null): ThemeRoles {
  const scheme = choice === "system" ? (system ?? "light") : choice;
  return scheme === "dark" ? darkTheme : lightTheme;
}

function systemScheme(): "light" | "dark" | null {
  try {
    if (typeof require === "undefined") return null;
    return require("react-native").useColorScheme() ?? null;
  } catch {
    return null;
  }
}

/** Follows the OS Appearance on device; resolves to light where Appearance is unavailable. */
export function useTheme(choice: ThemeChoice = "system"): ThemeRoles {
  return resolveTheme(choice, systemScheme());
}

export interface ThemeChoiceStorage {
  load(): Promise<ThemeChoice | null>;
  save(choice: ThemeChoice): Promise<void>;
}

/** Default persistence (in-memory). Screens may inject a file/secure-store
 *  implementation; the choice is a non-sensitive UX preference. */
export class MemoryThemeChoiceStorage implements ThemeChoiceStorage {
  private current: ThemeChoice | null = null;

  async load(): Promise<ThemeChoice | null> {
    return this.current;
  }

  async save(choice: ThemeChoice): Promise<void> {
    this.current = choice;
  }
}

export async function loadThemeChoice(storage: ThemeChoiceStorage): Promise<ThemeChoice> {
  const saved = await storage.load().catch(() => null);
  return saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
}

export async function saveThemeChoice(storage: ThemeChoiceStorage, choice: ThemeChoice): Promise<void> {
  await storage.save(choice);
}
