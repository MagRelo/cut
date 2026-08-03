import { getAddress, isAddress, zeroAddress } from "viem";
import { getOpsOracleAddress } from "./opsOracle.js";

/**
 * Cold address-only emergency recovery role (public config).
 * No recovery private key is accepted by web or cron.
 */
export function getEmergencyRecoveryAddressFromEnv(): `0x${string}` | null {
  const raw = process.env.EMERGENCY_RECOVERY_ADDRESS?.trim();
  if (!raw) return null;
  if (!isAddress(raw)) {
    throw new Error("EMERGENCY_RECOVERY_ADDRESS must be a valid EVM address");
  }
  return getAddress(raw) as `0x${string}`;
}

/**
 * Require a nonzero emergency-recovery address that differs from the hot OPS_ORACLE.
 */
export function requireEmergencyRecoveryAddress(): `0x${string}` {
  const addr = getEmergencyRecoveryAddressFromEnv();
  if (!addr || addr === zeroAddress) {
    throw new Error("EMERGENCY_RECOVERY_ADDRESS must be a nonzero EVM address");
  }
  const oracle = getAddress(getOpsOracleAddress());
  if (addr.toLowerCase() === oracle.toLowerCase()) {
    throw new Error("EMERGENCY_RECOVERY_ADDRESS must differ from OPS_ORACLE");
  }
  return addr;
}

export function assertValidEmergencyRecoveryAddress(
  emergencyRecovery: string,
  oracle: string,
): string | null {
  const recovery = emergencyRecovery.trim();
  if (!recovery || !isAddress(recovery) || getAddress(recovery) === zeroAddress) {
    return "Enter a valid nonzero emergency recovery address.";
  }
  const oracleTrimmed = oracle.trim();
  if (oracleTrimmed && isAddress(oracleTrimmed)) {
    if (getAddress(recovery).toLowerCase() === getAddress(oracleTrimmed).toLowerCase()) {
      return "Emergency recovery address must differ from the oracle.";
    }
  }
  return null;
}
