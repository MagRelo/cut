import {
  decodeFunctionData,
  encodeFunctionData,
  getAbiItem,
  getAddress,
  toFunctionSelector,
  zeroAddress,
  type Hex,
} from "viem";
import { KernelV3_1AccountAbi, KernelV3ExecuteAbi } from "@zerodev/sdk";
import { describe, expect, it } from "vitest";
import { encodeYieldCallData } from "./yieldCalls.js";

const WALLET = getAddress("0x1111111111111111111111111111111111111111");
const EMBEDDED = getAddress("0x2222222222222222222222222222222222222222");
const ECDSA_VALIDATOR = getAddress("0x845ADb2C711129d4f3966735eD98a9F09fC4cE57");

const executeSelector = toFunctionSelector(getAbiItem({ abi: KernelV3ExecuteAbi, name: "execute" }));
const rotate = encodeFunctionData({
  abi: KernelV3_1AccountAbi,
  functionName: "changeRootValidator",
  args: [`0x01${ECDSA_VALIDATOR.slice(2)}` as Hex, zeroAddress, EMBEDDED, "0x"],
});

describe("encodeYieldCallData", () => {
  it("sends the root change through execute", () => {
    const data = encodeYieldCallData([{ to: WALLET, value: 0n, data: rotate }]);

    expect(data.slice(0, 10).toLowerCase()).toBe(executeSelector.toLowerCase());
    expect(data.slice(0, 10).toLowerCase()).not.toBe(rotate.slice(0, 10).toLowerCase());

    const decoded = decodeFunctionData({ abi: KernelV3ExecuteAbi, data });
    expect(decoded.functionName).toBe("execute");
    const execution = decoded.args[1].toLowerCase().slice(2);
    expect(execution.startsWith(WALLET.slice(2).toLowerCase())).toBe(true);
    expect(execution.endsWith(rotate.slice(2).toLowerCase())).toBe(true);
  });

  it("rejects anything other than the one root change", () => {
    expect(() => encodeYieldCallData([])).toThrow(/Yield is one call/);
  });
});
