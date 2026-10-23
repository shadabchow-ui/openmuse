import type { Section, Workspace } from "../../../packages/domain/src";
import type { Capabilities } from "../../../packages/domain/src/muse-contract";

export type { Capabilities };

type Runtime = Workspace["runtime"] | undefined;

/** Hide-only: a missing `capabilities` object means every feature is shown, as upstream. */
export function capabilityOf(runtime: Runtime, key: keyof Capabilities): boolean {
  const capabilities = runtime?.capabilities;
  return capabilities === undefined ? true : capabilities[key];
}

export function visibleNav<T extends { id: Section }>(items: readonly T[], runtime: Runtime): T[] {
  return items.filter(
    (item) =>
      !(item.id === "ideas" && !capabilityOf(runtime, "ideas")) &&
      !(item.id === "goals" && !capabilityOf(runtime, "goals")),
  );
}
