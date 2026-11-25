import { getAddress, isAddress, type Address } from "viem";

export type QuorumApproval = {
  quorumId: string;
  publicKey: string;
  embeddedWalletId: string;
  embeddedAddress: Address;
};

export function storedDelegateAddress(signer: string): string {
  return isAddress(signer) ? getAddress(signer).toLowerCase() : signer;
}

export function writeQuorumApproval(approval: QuorumApproval): string {
  return JSON.stringify({
    quorumId: approval.quorumId,
    publicKey: approval.publicKey,
    embeddedWalletId: approval.embeddedWalletId,
    embeddedAddress: approval.embeddedAddress,
  });
}

export function readQuorumId(approval: string): string | null {
  try {
    const parsed = JSON.parse(approval) as { quorumId?: unknown };
    return typeof parsed.quorumId === "string" && parsed.quorumId.length > 0 ? parsed.quorumId : null;
  } catch {
    return null;
  }
}

export function readQuorumApproval(approval: string): QuorumApproval | null {
  try {
    const parsed = JSON.parse(approval) as Partial<QuorumApproval>;
    if (!parsed.quorumId || !parsed.publicKey || !parsed.embeddedWalletId || !parsed.embeddedAddress) {
      return null;
    }
    if (!isAddress(parsed.embeddedAddress)) return null;
    return {
      quorumId: parsed.quorumId,
      publicKey: parsed.publicKey,
      embeddedWalletId: parsed.embeddedWalletId,
      embeddedAddress: getAddress(parsed.embeddedAddress),
    };
  } catch {
    return null;
  }
}
