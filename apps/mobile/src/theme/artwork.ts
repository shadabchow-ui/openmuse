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
export const financeArtwork = {
  base: "#080B10",
  gradient: ["#281066", "#163BBF", "#148CE8"] as const,
  copy: "#D4DCFC",
  tile: "#1D2025",
  label: "#A4A7AD",
  sublabel: "#7E8289",
  saved: "#58D3AE",
} as const;
