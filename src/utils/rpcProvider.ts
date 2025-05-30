import { Address, Chain, Token, Transaction, TxBatch, TxHash } from "@/types";
import { JsonRpcProvider } from "ethers";
import { blockToTxBatch, txToTransaction } from "./helpers-ether";
import { createClient } from "@stacks/blockchain-api-client";
import { stacksBlockResponseToTxBatch } from "./helpers-stacks";
import { TxReceipt } from "./crypto";
import * as chains from "../chains.json";
export type ProviderType = "evm" | "stacks" | "bitcoin";

export interface ProviderConfig {
  type: ProviderType;
  rpcUrl: string;
  network?: string;
}

export interface TxBatchProvider {
  getTxBatch(blockNumber: number): Promise<TxBatch | null>;
  getTransaction(txHash: string): Promise<Transaction | null>;
  getTxReceipt(chain: Chain, txHash: string): Promise<TxReceipt | null>;
  getTokenDetails(chain: Chain, tokenAddress: string): Promise<Token | null>;
  getBlockRange(
    chain: Chain,
    address: Address,
    startBlock: number,
    endBlock: number
  ): Promise<Transaction[]>;
}

export function createProvider(config: ProviderConfig): TxBatchProvider {
  if (config.type === "evm") {
    const provider = new JsonRpcProvider(config.rpcUrl);
    return {
      getTxBatch: (blockNumber) =>
        provider.getBlock(blockNumber).then(blockToTxBatch),
      getTransaction: (txHash) =>
        provider.getTransaction(txHash).then(txToTransaction),
      getTxReceipt: (txHash) => Promise.resolve(null),
      getTokenDetails: async (chain, tokenAddress) => Promise.resolve(null),
      getBlockRange: async (
        chain: Chain,
        address: Address,
        startBlock: number,
        endBlock: number
      ) => [],
    };
  }
  if (config.type === "stacks") {
    const client = createClient({
      baseUrl: config.rpcUrl,
    });
    return {
      getTxBatch: async (blockHeight: number) => {
        const res = await client
          .GET(`/extended/v2/blocks/{height_or_hash}/transactions`, {
            params: {
              path: {
                height_or_hash: blockHeight,
              },
            },
          })
          .then((r) => r.data)
          .then(stacksBlockResponseToTxBatch);
        return res;
      },
      getTransaction: async (txId: string) => {
        const res = await fetch(`${config.rpcUrl}/extended/v1/tx/${txId}`);
        return res.json();
      },
      getTxReceipt: (txHash) => Promise.resolve(null),
      getTokenDetails: async (chain, tokenAddress) => Promise.resolve(null),
      getBlockRange: async (
        chain: Chain,
        address: Address,
        startBlock: number,
        endBlock: number
      ) => [],
    };
  }
  throw new Error("Unsupported provider type");
}
