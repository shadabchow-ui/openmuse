export type PageId =
  | "overview"
  | "memory"
  | "skills"
  | "devices"
  | "spend"
  | "phones"
  | "more"
  | "settings";

/** Icon names stay data-only so this module is testable without a renderer. */
export type PageIcon =
  | "overview"
  | "memory"
  | "skills"
  | "devices"
  | "spend"
  | "phones"
  | "more"
  | "settings";

export interface RobotPage {
  id: PageId;
  title: string;
  icon: PageIcon;
}

export const ROBOT_PAGES: readonly RobotPage[] = Object.freeze([
  { id: "overview", title: "Overview", icon: "overview" },
  { id: "memory", title: "Memory", icon: "memory" },
  { id: "skills", title: "Skills", icon: "skills" },
  { id: "devices", title: "Devices and health", icon: "devices" },
  { id: "spend", title: "Spend and trust", icon: "spend" },
  { id: "phones", title: "Phone sessions", icon: "phones" },
  { id: "more", title: "More on the web", icon: "more" },
  { id: "settings", title: "Settings", icon: "settings" },
]);
