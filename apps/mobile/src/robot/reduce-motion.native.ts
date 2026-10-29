import { AccessibilityInfo } from "react-native";

export async function isReduceMotionEnabled(): Promise<boolean> {
  return AccessibilityInfo.isReduceMotionEnabled();
}

export function subscribeReduceMotion(listener: (reduced: boolean) => void): () => void {
  const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", listener);
  return () => subscription.remove();
}
