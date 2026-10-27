import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  lightTheme,
  loadThemeChoice,
  MemoryThemeChoiceStorage,
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
  | ((id: string) => { useColorScheme: () => "light" | "dark" | null | undefined });

function useSystemScheme(): "light" | "dark" | null {
  try {
    if (typeof require === "undefined") return null;
    const rn = require("react-native");
    if (typeof rn.useColorScheme !== "function") return null;
    return rn.useColorScheme() ?? null;
  } catch {
    return null;
  }
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
  const store = useMemo(() => storage ?? new MemoryThemeChoiceStorage(), [storage]);
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
