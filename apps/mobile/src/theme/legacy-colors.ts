/**
 * Deprecated alias of the pre-theme static palette (DS-05).
 *
 * Kept so nothing outside the codemod breaks: values equal the colours
 * `apps/mobile/src/ui.tsx` exported before this job. New code uses
 * `useTheme()` roles instead. Pinned by `apps/mobile/test/theme.test.ts`.
 */
export const colors = {
  canvas: "#FCFCFC",
  card: "#FFFFFF",
  text: "#11191C",
  muted: "#697176",
  line: "#EEEEF0",
  blue: "#C8E7FF",
  blueDark: "#1473C8",
  sky: "#EDF7FD",
  green: "#E3F3E8",
  lavender: "#F0EEFA",
  orange: "#FDF0DF",
  danger: "#AA4A45",
} as const;
