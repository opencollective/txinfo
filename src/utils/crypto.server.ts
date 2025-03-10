import type { Address } from "@/types/index.d.ts";

export function truncateAddress(address: Address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
