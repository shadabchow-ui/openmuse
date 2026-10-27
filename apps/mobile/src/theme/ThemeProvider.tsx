import type { ReactNode } from "react";
// biome-ignore lint/correctness/noUnusedImports: the classic JSX runtime needs React in scope.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { defaultPreferenceStorage } from "./preference-storage";
import {
  lightTheme,
  loadThemeChoice,
  resolveTheme,
  type ThemeChoice,
  type ThemeChoiceStorage,
  type ThemeRoles,
} from "./theme";

export interface ThemeContextValue {
  theme: ThemeRoles;
  choice: ThemeChoice;
  scheme: "light" | "dark";
  setChoice: (choice: ThemeChoice) => Promise<void>;
}

const defaultValue: ThemeContextValue = {
  theme: { ...lightTheme, scheme: "light" as const },
  choice: "system",
  scheme: "light",
  setChoice: async () => {},
};

const ThemeContext = createContext<ThemeContextValue>(defaultValue);

declare const require:
  | undefined
  | ((id: string) => {
      Appearance?: {
        getColorScheme: () => "light" | "dark" | null;
        addChangeListener: (fn: (prefs: { colorScheme: "light" | "dark" | null }) => void) => {
          remove: () => void;
        };
      };
    });

/**
 * Follows the OS appearance on device and web (react-native-web supports
 * Appearance); resolves to light where Appearance is unavailable. All hooks
 * run unconditionally; availability is probed inside the effect.
 */
function useSystemScheme(): "light" | "dark" | null {
  const [system, setSystem] = useState<"light" | "dark" | null>(null);
  useEffect(() => {
    let sub: { remove: () => void } | undefined;
    try {
      if (typeof require === "undefined") return;
      const rn = require("react-native");
      const appearance = rn.Appearance;
      if (!appearance || typeof appearance.getColorScheme !== "function") return;
      setSystem(appearance.getColorScheme() ?? null);
      if (typeof appearance.addChangeListener === "function") {
        sub = appearance.addChangeListener((prefs: { colorScheme: "light" | "dark" | null }) => {
          setSystem(prefs.colorScheme ?? null);
        });
      }
    } catch {
      // Appearance unavailable: stay light.
    }
    return () => {
      sub?.remove();
    };
  }, []);
  return system;
}

export function ThemeProvider({
  children,
  initialChoice = "system",
  storage,
}: {
  children: ReactNode;
  initialChoice?: ThemeChoice;
  storage?: ThemeChoiceStorage;
}) {
  const store = useMemo(() => storage ?? defaultPreferenceStorage, [storage]);
  const [choice, setChoiceState] = useState<ThemeChoice>(initialChoice);
  const system = useSystemScheme();
  useEffect(() => {
    let live = true;
    void loadThemeChoice(store).then((saved) => {
      if (live) setChoiceState(saved);
    });
    return () => {
      live = false;
    };
  }, [store]);
  const setChoice = useCallback(
    async (next: ThemeChoice) => {
      setChoiceState(next);
      await store.save(next).catch(() => {});
    },
    [store],
  );
  const value = useMemo<ThemeContextValue>(() => {
    const theme = resolveTheme(choice, system);
    return { theme, choice, scheme: theme.scheme, setChoice };
  }, [choice, system, setChoice]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
