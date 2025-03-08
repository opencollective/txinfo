type HexString<Length extends number> = `0x${string}` & { length: Length };
export type Address = HexString<42>;
export type TxHash = HexString<66>;
export type ChainId = number;
export type AddressType = "address" | "tx";
export type URI = `${ChainId}:${AddressType}:${Address | TxHash}`;

export type Token = {
  name: string;
  symbol: string;
  address: Address;
  decimals: number;
};
export interface Transaction {
  txHash: TxHash;
  timestamp: number;
  from: Address;
  to: Address;
  value: string;
  token: Token;
  blockNumber: number;
}

export type ChainConfig = {
  id: number;
  rpc: string | string[];
  explorer_url: string;
  explorer_api?: string;
  explorer_name: string;
};
