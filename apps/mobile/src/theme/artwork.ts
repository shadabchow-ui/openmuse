/**
 * Scheme-invariant brand artwork colours (DS-05).
 *
 * These are illustration values, not UI chrome: the capybara mascot disc
 * palette and the finance-tracker card artwork render byte-identical in
 * light and dark. They live here (inside the exempt theme dir) so the
 * literal guard never flags them and chrome code never inlines them.
 */
export const mascotPalette = {
  sky: "#ECF5FA",
  sand: "#FAF0DF",
  lilac: "#F1ECF9",
} as const;
export type MascotVariant = keyof typeof mascotPalette;

/** Third-party connection brand marks (Gmail, Calendar, browser, OpenBot).
 *  Brand colours stay exact in both schemes; they are identity, not UI. */
export const connectionBrands = {
  gmail: "#EA5B4D",
  calendar: "#4285F4",
  browser: "#1987CF",
  openbot: "#6866A6",
} as const;
export const financeArtwork = {
  base: "#080B10",
  gradient: ["#281066", "#163BBF", "#148CE8"] as const,
  copy: "#D4DCFC",
  tile: "#1D2025",
  label: "#A4A7AD",
  sublabel: "#7E8289",
  saved: "#58D3AE",
  ink: "#FFFFFF",
} as const;
