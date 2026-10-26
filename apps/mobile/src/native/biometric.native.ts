/** Biometric convenience lock: capability probes and one authentication attempt. */

import * as LocalAuthentication from "expo-local-authentication";

export async function biometricCapabilities(): Promise<{ hasHardware: boolean; enrolled: boolean }> {
  try {
    const [hasHardware, enrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    return { hasHardware, enrolled };
  } catch {
    return { hasHardware: false, enrolled: false };
  }
}

export async function authenticateBiometric(): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({ disableDeviceFallback: false });
    return result.success;
  } catch {
    return false;
  }
}
