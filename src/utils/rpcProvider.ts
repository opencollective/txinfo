import { Address, Chain, Token, Transaction, TxBatch } from "@/types";
import { createClient } from "@stacks/blockchain-api-client";
import { createClient as createTokenClient } from "@hirosystems/token-metadata-api-client";
import { JsonRpcProvider } from "ethers";
import { TxReceipt } from "./crypto";
import * as EthereumHelpers from "./helpers-ether";
import * as Stacks from "./crypto-stacks";
import * as Ethereum from "./crypto-ethereum";
export type ProviderType = "ethereum" | "stacks" | "bitcoin";

export interface ProviderConfig {
  type: ProviderType;
  rpcUrl: string;
  network?: string;
}

export interface TxBatchProvider {
  getTxBatch(blockNumber: number): Promise<TxBatch | null>;
  getTransaction(txId: string): Promise<Transaction | null>;
  getTxReceipt(chain: Chain, txId: string): Promise<TxReceipt | null>;
  getTokenDetails(chain: Chain, tokenAddress: string): Promise<Token | null>;
  getBlockRange(
    chain: Chain,
    address: Address,
    startBlock: number,
    endBlock: number
  ): Promise<Transaction[]>;
}

export function createProvider(config: ProviderConfig): TxBatchProvider {
  if (config.type === "ethereum") {
    const provider = new JsonRpcProvider(config.rpcUrl);
    return {
      getTxBatch: (blockNumber) =>
        provider.getBlock(blockNumber).then(EthereumHelpers.blockToTxBatch),
      getTransaction: (txId) =>
        provider.getTransaction(txId).then(EthereumHelpers.txToTransaction),
      getTxReceipt: (chain, txId) =>
        Ethereum.getTxReceipt(chain, txId, provider),
      getTokenDetails: async (chain, tokenAddress) =>
        Ethereum.getTokenDetails(chain, tokenAddress, provider),
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

    const tokenClient = createTokenClient({
      baseUrl: config.rpcUrl,
    });
    return {
      getTxBatch: async (blockHeight: number) =>
        Stacks.getTxBatch(blockHeight, client),
      getTransaction: async (txId: string) => {
        const res = await fetch(`${config.rpcUrl}/extended/v1/tx/${txId}`);
        return res.json();
      },
      getTxReceipt: async (chain: Chain, txId: string) =>
        Stacks.getTxReceipt(chain, txId, client),
      getTokenDetails: async (chain: Chain, tokenContractAddress: string) =>
        Stacks.getTokenDetails(
          chain,
          tokenContractAddress as `${string}.${string}:${string}`,
          tokenClient
        ),
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
