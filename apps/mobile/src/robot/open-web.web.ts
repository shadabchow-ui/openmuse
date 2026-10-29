/** Web builds open the validated link in a new tab without an opener handle. */
export async function openWeb(url: string): Promise<void> {
  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
