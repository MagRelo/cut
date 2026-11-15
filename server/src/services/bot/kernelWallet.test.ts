import { getAddress, zeroAddress, type Address } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { describe, expect, it, vi } from "vitest";
import {
  isKernelWalletOwner,
  kernelAddressForOwner,
  type WalletOwnerReader,
} from "./kernelWallet.js";

const owner = getAddress(privateKeyToAccount(generatePrivateKey()).address);
const other = getAddress(privateKeyToAccount(generatePrivateKey()).address);

function reader(code: string | undefined, onchainOwner: Address = zeroAddress): WalletOwnerReader {
  return {
    getCode: vi.fn(async () => code),
    readEcdsaOwner: vi.fn(async () => onchainOwner),
  };
}

describe("kernelAddressForOwner", () => {
  it("is deterministic per owner and differs between owners", async () => {
    const a = await kernelAddressForOwner(owner);
    expect(await kernelAddressForOwner(owner.toLowerCase() as Address)).toBe(a);
    expect(await kernelAddressForOwner(other)).not.toBe(a);
    expect(a).toBe(getAddress(a));
  });
});

describe("isKernelWalletOwner", () => {
  it("accepts the owner of an undeployed wallet by its counterfactual address", async () => {
    const wallet = await kernelAddressForOwner(owner);
    const r = reader(undefined);
    await expect(isKernelWalletOwner(84532, wallet, owner, r)).resolves.toBe(true);
    expect(r.readEcdsaOwner).not.toHaveBeenCalled();
  });

  it("rejects another key for an undeployed wallet", async () => {
    const wallet = await kernelAddressForOwner(owner);
    await expect(isKernelWalletOwner(84532, wallet, other, reader("0x"))).resolves.toBe(false);
  });

  it("uses the ECDSA validator's stored owner once the wallet is deployed", async () => {
    const wallet = await kernelAddressForOwner(owner);
    await expect(isKernelWalletOwner(8453, wallet, owner, reader("0x60", owner))).resolves.toBe(
      true,
    );
    // An on-chain owner rotation wins over the counterfactual address.
    await expect(isKernelWalletOwner(8453, wallet, owner, reader("0x60", other))).resolves.toBe(
      false,
    );
    await expect(isKernelWalletOwner(8453, wallet, other, reader("0x60", other))).resolves.toBe(
      true,
    );
  });

  it("rejects a deployed wallet whose root validator is not the ECDSA validator", async () => {
    const wallet = await kernelAddressForOwner(owner);
    await expect(
      isKernelWalletOwner(8453, wallet, owner, reader("0x60", zeroAddress)),
    ).resolves.toBe(false);
  });
});
