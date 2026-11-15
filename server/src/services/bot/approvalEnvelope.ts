import { type Hex } from "viem";

const PERMISSION_ID = /^0x[0-9a-fA-F]{8}$/;

export type ApprovalEnvelope = {
  approval: string;
  permissionId: Hex;
};

export function packApproval(envelope: ApprovalEnvelope): string {
  if (!PERMISSION_ID.test(envelope.permissionId)) {
    throw new Error("Delegate permission id is missing");
  }
  return JSON.stringify({
    approval: envelope.approval,
    permissionId: envelope.permissionId.toLowerCase(),
  });
}

export function unpackApproval(raw: string): ApprovalEnvelope {
  const parsed = JSON.parse(raw) as { approval?: unknown; permissionId?: unknown };
  if (typeof parsed.approval !== "string" || !parsed.approval) {
    throw new Error("Delegate approval is missing");
  }
  if (typeof parsed.permissionId !== "string" || !PERMISSION_ID.test(parsed.permissionId)) {
    throw new Error("Delegate permission id is missing");
  }
  return {
    approval: parsed.approval,
    permissionId: parsed.permissionId.toLowerCase() as Hex,
  };
}
