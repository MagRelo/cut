import {
  concatHex,
  decodeAbiParameters,
  decodeFunctionData,
  encodeAbiParameters,
  encodeFunctionData,
  getAddress,
  type Address,
  type Hex,
} from "viem";

export type AgentCall = {
  to: Address;
  data: Hex;
  value: bigint;
};

const kernelExecuteAbi = [
  {
    type: "function",
    name: "execute",
    stateMutability: "payable",
    inputs: [
      { name: "execMode", type: "bytes32" },
      { name: "executionCalldata", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

const batchAbi = [
  {
    type: "tuple[]",
    components: [
      { name: "target", type: "address" },
      { name: "value", type: "uint256" },
      { name: "callData", type: "bytes" },
    ],
  },
] as const;

const CALL_SINGLE = "00";
const CALL_BATCH = "01";
const CALL_DELEGATE = "ff";

function kernelExecMode(callType: "single" | "batch" | "delegatecall"): Hex {
  const byte = callType === "single" ? CALL_SINGLE : callType === "batch" ? CALL_BATCH : CALL_DELEGATE;
  return `0x${byte}${"00".repeat(31)}` as Hex;
}

export function encodeKernelExecute(calls: AgentCall[]): Hex {
  if (calls.length === 1) {
    const call = calls[0];
    if (!call) throw new Error("User operation calldata is not a Kernel execute");
    return encodeFunctionData({
      abi: kernelExecuteAbi,
      functionName: "execute",
      args: [
        kernelExecMode("single"),
        concatHex([call.to, `0x${call.value.toString(16).padStart(64, "0")}` as Hex, call.data]),
      ],
    });
  }
  const executionCalldata = encodeAbiParameters(batchAbi, [
    calls.map((call) => ({
      target: call.to,
      value: call.value,
      callData: call.data,
    })),
  ]);
  return encodeFunctionData({
    abi: kernelExecuteAbi,
    functionName: "execute",
    args: [kernelExecMode("batch"), executionCalldata],
  });
}

export function decodeKernelExecute(callData: Hex): AgentCall[] {
  let decoded: ReturnType<typeof decodeFunctionData<typeof kernelExecuteAbi>>;
  try {
    decoded = decodeFunctionData({ abi: kernelExecuteAbi, data: callData });
  } catch {
    throw new Error("User operation calldata is not a Kernel execute");
  }
  if (decoded.functionName !== "execute") {
    throw new Error("User operation calldata is not a Kernel execute");
  }
  const [execMode, executionCalldata] = decoded.args;
  const callType = execMode.slice(2, 4).toLowerCase();
  if (callType === CALL_DELEGATE) throw new Error("Delegatecall is not sponsorable");
  if (callType === CALL_SINGLE) return [decodeSingle(executionCalldata)];
  if (callType === CALL_BATCH) return decodeBatch(executionCalldata);
  throw new Error("Unsupported execution mode");
}

function decodeSingle(executionCalldata: Hex): AgentCall {
  const raw = executionCalldata.slice(2);
  if (raw.length < 104) throw new Error("User operation calldata is not a Kernel execute");
  const to = getAddress(`0x${raw.slice(0, 40)}`);
  const value = BigInt(`0x${raw.slice(40, 104)}`);
  const data = (`0x${raw.slice(104)}` || "0x") as Hex;
  return { to, value, data: data === "0x" ? "0x" : data };
}

function decodeBatch(executionCalldata: Hex): AgentCall[] {
  let rows: readonly { target: Address; value: bigint; callData: Hex }[];
  try {
    const decoded = decodeAbiParameters(batchAbi, executionCalldata);
    rows = decoded[0];
  } catch {
    throw new Error("User operation calldata is not a Kernel execute");
  }
  if (rows.length === 0) throw new Error("User operation has no calls");
  return rows.map((row) => ({
    to: getAddress(row.target),
    value: row.value,
    data: row.callData,
  }));
}
