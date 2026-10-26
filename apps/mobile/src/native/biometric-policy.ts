/** Biometric convenience lock: local gate for the device-held token, never an authorization step. */

export interface BiometricLockInput {
  enabled?: boolean;
  hasHardware: boolean;
  enrolled: boolean;
  awayMs: number;
  lockAfterMs?: number;
}

export function shouldLock(input: BiometricLockInput): boolean {
  const enabled = input.enabled ?? false;
  const lockAfterMs = input.lockAfterMs ?? 60000;
  return enabled && input.hasHardware && input.enrolled && input.awayMs >= lockAfterMs;
}
