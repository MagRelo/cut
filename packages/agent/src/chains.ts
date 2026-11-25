import { getAddress, type Address } from "viem";

/** Payment token and contest factory. Same addresses as server/src/contracts. */
const PAYMENT_TOKEN: Record<number, Address> = {
  8453: getAddress("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"),
  84532: getAddress("0x55dd6A268439607711471B6EB353045eeE680549"),
};

const CONTEST_FACTORY: Record<number, Address> = {
  8453: getAddress("0x01664eA6Bde9E119B5Ec916Aa78FAfF9aeEffd1b"),
  84532: getAddress("0xfFE5ab468Feb2CcD02f3A96d3e750d451e115E4d"),
};

export function paymentTokenAddress(chainId: number): Address | null {
  return PAYMENT_TOKEN[chainId] ?? null;
}

export function contestFactoryAddress(chainId: number): Address | null {
  return CONTEST_FACTORY[chainId] ?? null;
}
