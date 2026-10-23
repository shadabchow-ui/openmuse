import type { Workspace } from "../../../packages/domain/src";

/** Runtime brand first, then the build setting, then the upstream name. */
export function brandName(
  runtime: Workspace["runtime"] | undefined,
  config: { brandName: string | undefined },
): string {
  const fromRuntime = runtime?.brand?.name?.trim();
  return fromRuntime || config.brandName || "OpenMuse";
}

/** True when a brand replaces the upstream mascot. */
export function hasCustomBrand(
  runtime: Workspace["runtime"] | undefined,
  config: { brandName: string | undefined },
): boolean {
  return Boolean(runtime?.brand?.name?.trim() || config.brandName);
}
