type HexString<Length extends number> = `0x${string}` & { length: Length };
export type Address = HexString<42>;
export type TxHash = HexString<66>;
export type ChainId = number;
export type AddressType = "address" | "tx";
export type URI = `${ChainId}:${AddressType}:${Address | TxHash}`;

export type Token = {
  name?: string;
  symbol?: string;
  address: Address;
  decimals?: number;
};
export interface Transaction {
  blockNumber: number;
  txHash: TxHash;
  txIndex?: number;
  logIndex?: number;
  timestamp: number;
  from: Address;
  to: Address;
  value: string;
  token: Token;
}

/**
 * Etherscan API response for token transfers
 */
export type EtherscanResponse = {
  status: string;
  message: string;
  result: EtherscanTransfer[];
};

export type EtherscanTransfer = {
  blockNumber: number;
  timeStamp: number;
  hash: TxHash;
  nonce: number;
  blockHash: TxHash;
  from: Address;
  contractAddress: Address;
  to: Address;
  value: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  transactionIndex: number;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  cumulativeGasUsed: string;
  input: string;
  confirmations: string;
};

export type ChainConfig = {
  id: number;
  explorer_url: string;
  explorer_api?: string;
  explorer_name: string;
  rpc: string | string[];
  ws?: string | string[];
};
