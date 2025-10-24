import { EthereumDataProvider } from "@/providers-blockchains/ethereum";
import {
  Address,
  BlockchainTransaction,
  Chain,
  LogEvent,
  Token,
  Transaction,
  TxBatch,
} from "@/types";
import { createClient as createTokenClient } from "@hirosystems/token-metadata-api-client";
import { createClient } from "@stacks/blockchain-api-client";
import { Log } from "ethers";
import { TxReceipt } from "./crypto";
import { StacksDataProvider } from "@/providers-blockchains/stacks";
export type ProviderType = "ethereum" | "stacks" | "bitcoin";

export interface ProviderConfig {
  type: ProviderType;
  rpcUrl: string;
  network?: string;
}

export interface BlockchainDataProvider {
  processBlockRange(
    chain: string,
    address: Address,
    fromBlock: number,
    toBlock: number
  ): Transaction[] | PromiseLike<Transaction[]>;
  // TODO use LogEvent instead of Log
  getTxFromLog(chain: string, log: Log): Promise<BlockchainTransaction>;
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
  if (config.type === "ethereum") {
    return new EthereumDataProvider(config.rpcUrl);
  }
  if (config.type === "stacks") {
    return new StacksDataProvider(config.rpcUrl);
  }
  throw new Error("Unsupported provider type");
}
