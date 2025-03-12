import type { Address } from "@/types/index.d.ts";
import { JsonRpcProvider } from "ethers";
import chains from "../chains.json";

export function truncateAddress(address: Address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

const ensNameCache = new Map<Address, string>();
export async function getENSNameFromAddress(address: Address) {
  if (ensNameCache.has(address)) {
    return ensNameCache.get(address);
  }
  const provider = new JsonRpcProvider(chains["ethereum"].rpc[0]);
  const ensName = await provider.lookupAddress(address);
  ensNameCache.set(address, ensName || "");
  return ensName || undefined;
}
const ensAddressCache = new Map<string, Address>();
export async function getAddressFromENSName(ensName: string) {
  if (ensAddressCache.has(ensName)) {
    return ensAddressCache.get(ensName);
  }
  const provider = new JsonRpcProvider(chains["ethereum"].rpc[0]);
  const address = await provider.resolveName(ensName);
  ensAddressCache.set(ensName, address as Address);
  return address as Address;
}
