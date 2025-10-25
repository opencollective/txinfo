import { EthereumDataProvider } from "@/providers-blockchains/ethereum";
import { StacksDataProvider } from "@/providers-blockchains/stacks";
import {
  Address,
  BlockchainTransaction,
  Chain,
  LogEvent,
  Token,
  Transaction,
  TxBatch,
} from "@/types";
import { Log } from "ethers";
import { TxReceipt } from "./crypto";
export type ChainNamespace = "eip155" | "stacks" | "bip122";

export interface ProviderConfig {
  namespace: ChainNamespace;
  rpcUrl: string;
  network?: string;
}

export interface BlockchainDataProvider {
  getBlockNumber(): Promise<number>;
  getLogs(filter: {
    fromBlock: number | undefined;
    toBlock: number;
    topics: (string | null)[];
  }): Promise<LogEvent[]>;
  getTxBatch(blockNumber: number): Promise<TxBatch | null>;
  getTransaction(txId: string): Promise<Transaction | null>;
  getTxReceipt(chain: Chain, txId: string): Promise<TxReceipt | null>;
  getTokenDetails(chain: Chain, tokenAddress: Address): Promise<Token | null>;
  getBlockRange(
    chain: Chain,
    address: Address,
    startBlock: number,
    endBlock: number
  ): Promise<BlockchainTransaction[]>;
}

export function createProvider(config: ProviderConfig): BlockchainDataProvider {
  if (config.namespace === "eip155") {
    return new EthereumDataProvider(config.rpcUrl);
  }
  if (config.namespace === "stacks") {
    return new StacksDataProvider(config.rpcUrl);
  }
  throw new Error("Unsupported provider type");
}
