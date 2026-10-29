function motionQuery(): MediaQueryList | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return null;
  return window.matchMedia("(prefers-reduced-motion: reduce)");
}

export async function isReduceMotionEnabled(): Promise<boolean> {
  return motionQuery()?.matches ?? false;
}

export function subscribeReduceMotion(listener: (reduced: boolean) => void): () => void {
  const query = motionQuery();
  if (!query) return () => {};
  const handler = (event: MediaQueryListEvent) => listener(event.matches);
  query.addEventListener("change", handler);
  return () => query.removeEventListener("change", handler);
}
