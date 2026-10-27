/**
 * Token-driven theme roles for the OpenMuse client (DS-05).
 *
 * Light scheme = the fork`s pre-existing colours verbatim (pixel parity).
 * Dark scheme = DS-01 generated token roles (`generated/open-muse.ts`,
 * pearl-a-pure) only. Wash roles pair with on-wash text roles so descendants
 * stay readable in both schemes; see `docs/THEME.md` for the full map.
 */

import { dark as tokenDark } from "./generated/open-muse";

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
  info: string;
  scrim: string;
  /** Standalone saturated status text on default surfaces. */
  successText: string;
  /** Text on info/success/accent/warning wash surfaces. */
  onInfo: string;
  onSuccess: string;
  onAccent: string;
  onWarning: string;
  /** The scheme this object was resolved for (lets components pair tones). */
  scheme: "light" | "dark";
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
  primary: "#C8E7FF", // colors.blue
  primaryForeground: TEXT, // old primary-button text
  // colors has no secondary surface: exact s.secondary background, recorded.
  secondary: "#F1F2F3",
  secondaryForeground: TEXT,
  muted: "#E2E4E7", // fork code-wash literal
  mutedForeground: "#697176", // colors.muted (secondary text)
  accent: "#F0EEFA", // colors.lavender
  accentForeground: TEXT,
  destructive: "#AA4A45", // colors.danger
  destructiveForeground: PAPER,
  success: "#E3F3E8", // colors.green
  successForeground: "#1d7f53", // token light.success
  warning: "#FDF0DF", // colors.orange
  warningForeground: TEXT,
  border: "#EEEEF0", // colors.line
  input: "#EEEEF0", // colors.line
  ring: "#1473C8", // colors.blueDark
  link: "#1473C8", // colors.blueDark
  info: "#EDF7FD", // colors.sky
  scrim: "#11111361", // token light.scrim
  successText: "#248258", // fork run-status literal
  onInfo: TEXT,
  onSuccess: TEXT,
  onAccent: TEXT,
  onWarning: TEXT,
  scheme: "light",
};

export const darkTheme: ThemeRoles = {
  background: tokenDark.background,
  foreground: tokenDark.foreground,
  card: tokenDark.card,
  cardForeground: tokenDark["card-foreground"],
  popover: tokenDark.popover,
  popoverForeground: tokenDark["popover-foreground"],
  primary: tokenDark.primary,
  primaryForeground: tokenDark["primary-foreground"],
  secondary: tokenDark.secondary,
  secondaryForeground: tokenDark["secondary-foreground"],
  muted: tokenDark.muted,
  mutedForeground: tokenDark["muted-foreground"],
  accent: tokenDark.accent,
  accentForeground: tokenDark["accent-foreground"],
  destructive: tokenDark.destructive,
  destructiveForeground: tokenDark["destructive-foreground"],
  success: tokenDark.success,
  successForeground: tokenDark["success-foreground"],
  warning: tokenDark.warning,
  warningForeground: tokenDark["warning-foreground"],
  border: tokenDark.border,
  input: tokenDark.input,
  ring: tokenDark.ring,
  link: tokenDark.link,
  info: tokenDark.info,
  scrim: tokenDark.scrim,
  successText: tokenDark.success,
  onInfo: tokenDark["info-foreground"],
  onSuccess: tokenDark["success-foreground"],
  onWarning: tokenDark["warning-foreground"],
  onAccent: tokenDark["accent-foreground"],
  scheme: "dark",
};

export type ThemeChoice = "light" | "dark" | "system";

export function resolveTheme(choice: ThemeChoice, system: "light" | "dark" | null): ThemeRoles {
  const scheme = choice === "system" ? (system ?? "light") : choice;
  return scheme === "dark" ? { ...darkTheme, scheme: "dark" } : { ...lightTheme, scheme: "light" };
}

declare const require:
  | undefined
  | ((id: string) => { useColorScheme: () => "light" | "dark" | null | undefined });

function systemScheme(): "light" | "dark" | null {
  try {
    if (typeof require === "undefined") return null;
    return require("react-native").useColorScheme() ?? null;
  } catch {
    return null;
  }
}

/** Follows the OS Appearance on device; resolves to light where Appearance is unavailable. */
export function systemSchemeOrNull(): "light" | "dark" | null {
  return systemScheme();
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
