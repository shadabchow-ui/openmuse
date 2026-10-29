export type RobotLayout = "single" | "split";

export const ROBOT_SPLIT_MIN_WIDTH = 900;
export const OVERVIEW_TWO_COLUMN_MIN_WIDTH = 600;
export const ROBOT_TAB_COUNT = 6;
export const ROBOT_TARGET_PT = 44;
export const ROBOT_TAB_BAR_MAX_WIDTH = 370;

export function robotLayoutFor(width: number): RobotLayout {
  return width >= ROBOT_SPLIT_MIN_WIDTH ? "split" : "single";
}

export function overviewColumns(width: number): 1 | 2 {
  return width >= OVERVIEW_TWO_COLUMN_MIN_WIDTH ? 2 : 1;
}

/** Arithmetic check for the six native tabs: 44 pt targets fit the 320 pt phone. */
export function tabBarFits(
  available: number,
  count = ROBOT_TAB_COUNT,
  target = ROBOT_TARGET_PT,
): boolean {
  return count * target <= Math.min(available, ROBOT_TAB_BAR_MAX_WIDTH);
}
