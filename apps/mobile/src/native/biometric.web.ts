/** Web biometrics: absent. The lock is a native-mode convenience. */

export async function biometricCapabilities(): Promise<{ hasHardware: boolean; enrolled: boolean }> {
  return { hasHardware: false, enrolled: false };
}

export async function authenticateBiometric(): Promise<boolean> {
  return false;
}
