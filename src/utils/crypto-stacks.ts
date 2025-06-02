"use client";

import type {
  BlockchainTransaction,
  Chain,
  Transaction,
} from "@/types/index.d.ts";
import { Client } from "@stacks/blockchain-api-client";
import { paths as stacksApiPaths } from "@stacks/blockchain-api-client/lib/generated/schema";
import { Client as TokenClient } from "@hirosystems/token-metadata-api-client";
import { paths as stacksTokenPaths } from "@hirosystems/token-metadata-api-client/lib/generated/schema";
import { ethers, JsonRpcProvider } from "ethers";
import ERC20_ABI from "../erc20.abi.json";
import { TxReceipt } from "./crypto";
import * as crypto from "./crypto.server";
import { blockToTxBatch, eventToLogEvent } from "./helpers-stacks";
import { c32addressDecode } from "c32check";
export const truncateAddress = crypto.truncateAddress;

const cache = {};
const localStorage =
  typeof window !== "undefined"
    ? window.localStorage
    : {
        getItem: (key: string) => {
          return cache[key as keyof typeof cache];
        },
        setItem: (key: string, value: string) => {
          (cache as Record<string, string>)[key] = value;
        },
        removeItem: (key: string) => {
          delete (cache as Record<string, string>)[key];
        },
      };

const setItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    console.error(
      "Error setting item:",
      err,
      "item length:",
      value.length,
      `${((value.length * 2) / 1024 / 1024).toFixed(2)}MB`
    );
  }
};

export const getBlockTimestamp = async (
  chain: string,
  blockNumber: number,
  provider: JsonRpcProvider
) => {
  const key = `${chain}:${blockNumber}`;
  const cached = localStorage.getItem(key);
  if (cached) {
    return JSON.parse(cached);
  }

  const block = await provider.getBlock(blockNumber);
  if (!block) {
    throw new Error(`Block not found: ${blockNumber}`);
  }
  setItem(key, block.timestamp.toString());
  return block.timestamp;
};

export const isStacksAddress = (address: string): boolean => {
  try {
    return c32addressDecode(address.toUpperCase()) !== null;
  } catch (e) {
    console.log(address, e);
    return false;
  }
};

export const isContractAddress = (address: string): boolean => {
  const [contractAddress, contractName] = address.split(".");
  return isStacksAddress(contractAddress) !== null && contractName?.length > 0;
};

export async function getTokenDetails(
  chain: string,
  contractId: `${string}.${string}`,
  client: TokenClient<stacksTokenPaths, `${string}/${string}`>
) {
  try {
    // Check cache first
    const key = `${chain}:${contractId}`;
    const cached = localStorage.getItem(key);
    if (cached) {
      const res = JSON.parse(cached);
      res.cached = true;
      return res;
    }

    // Validate contract address
    if (!isContractAddress(contractId)) {
      throw new Error(`Invalid contract address: ${contractId}`);
    }

    const token = await client
      .GET("/metadata/v1/ft/{principal}", {
        params: {
          path: {
            principal: contractId,
          },
        },
      })
      .then((r) => r.data);
    if (!token || !token.name || !token.symbol || !token.decimals) {
      throw new Error(
        `Token details not found for contract address: ${contractId}`
      );
    }

    const tokenDetails = {
      name: token.name,
      symbol: token.symbol,
      decimals: Number(token.decimals),
      address: contractId,
    };

    // Cache the result
    setItem(
      key,
      JSON.stringify(tokenDetails, (_, value) =>
        typeof value === "bigint" ? value.toString() : value
      )
    );

    return tokenDetails;
  } catch (err) {
    console.error("Error fetching token details:", err);
    return {
      name: "Unknown Token",
      symbol: "???",
      decimals: 18,
      address: contractId,
    };
  }
}

export async function getTxBatch(
  blockHeight: number,
  client: Client<stacksApiPaths, `${string}/${string}`>
) {
  return await client
    .GET(`/extended/v2/blocks/{height_or_hash}/transactions`, {
      params: {
        path: {
          height_or_hash: blockHeight,
        },
      },
    })
    .then((r) => r.data)
    .then(blockToTxBatch);
}

export async function getTxReceipt(
  chain: Chain,
  txId: string,
  client: Client<stacksApiPaths, `${string}/${string}`>
): Promise<TxReceipt | null> {
  const txResponse = await client.GET(`/extended/v1/tx/{tx_id}`, {
    params: {
      path: {
        tx_id: txId,
      },
    },
  });
  console.log("txResponse", txResponse);
  // convert txResponse to TxReceipt
  const tx = txResponse.data;
  // ignore tx that are not confirmed
  if (
    !tx ||
    !tx.tx_id ||
    tx.tx_status === "pending" ||
    tx.tx_status === "dropped_replace_by_fee" ||
    tx.tx_status === "dropped_problematic" ||
    tx.tx_status === "dropped_replace_across_fork" ||
    tx.tx_status === "dropped_stale_garbage_collect" ||
    tx.tx_status === "dropped_too_expensive"
  ) {
    console.error("Transaction not found:", txId);
    return null;
  }

  switch (tx.tx_status) {
    case "success":
    case "abort_by_response":
    case "abort_by_post_condition":
      if (typeof tx.block_height !== "number") {
        console.error("Confirmed transaction missing block_height:", txId);
        return null;
      }

      const blockNumber = tx.block_height;
      if (tx.event_count === 0) {
        return null;
      }

      const event = tx.events.find(
        (e) => e.event_type === "fungible_token_asset"
      );
      const contract_address = event?.asset.asset_id.split("::")[0];
      if (!contract_address) {
        console.error("Transaction does not have a token:", txId);
        return null;
      }
      const res = {
        chainId: 1,
        hash: tx.tx_id,
        blockNumber,
        timestamp: tx.block_time,
        contract_address: contract_address,
        events: tx.events.map(eventToLogEvent),
      };
      console.log("getTxReceipt", res);
      setItem(
        `TxReceipt:${tx.tx_id}`,
        JSON.stringify(res, (_, value) =>
          typeof value === "bigint" ? value.toString() : value
        )
      );

      return res as TxReceipt;

    default:
      // Unknown status
      console.error("Unknown tx_status:", tx.tx_status);
      return null;
  }
}

/**
 * Get the transactions in a block range from or to an address (sorted by time DESC, so newest first)
 * @param chain - The chain to get the block range for
 * @param address - The address to get the block range for
 * @param fromBlock - The starting block
 * @param toBlock - The ending block
 * @param provider - The provider to use
 */
export async function processBlockRange(
  chain: string,
  address: string,
  fromBlock: number,
  toBlock: number,
  client: Client<stacksApiPaths, `${string}/${string}`>,
  tokenClient: TokenClient<stacksTokenPaths, `${string}/${string}`>
): Promise<Transaction[]> {
  const key =
    `${chain}:${address}[${fromBlock}-${toBlock}]-processed`.toLowerCase();
  // const cached = localStorage.getItem(key);
  // if (cached && (!window.useCache || window.useCache !== false)) {
  //   const res = JSON.parse(cached);
  //   res.cached = true;
  //   return res;
  // }
  localStorage.removeItem(key); // remove previous cache

  const txs = await getBlockRange(chain, address, fromBlock, toBlock, client);
  if (txs.length > 0) {
    const newTxs: Transaction[] = await Promise.all(
      txs.map(async (tx: BlockchainTransaction) => {
        const timestamp = await getBlockTimestamp(
          chain,
          tx.blockNumber,
          client
        );
        const token = await getTokenDetails(
          chain,
          tx.token.address as `${string}.${string}`,
          tokenClient
        );
        return {
          ...tx,
          timestamp,
          token,
        };
      })
    );
    // setItem(key, JSON.stringify(newTxs));
    return newTxs;
  } else {
    return [];
  }
}

/**
 * Get the transactions in a block range from or to an address (sorted by time DESC, so newest first)
 * @param chain - The chain to get the block range for
 * @param accountAddress - The address to get the block range for
 * @param fromBlock - The starting block
 * @param toBlock - The ending block
 * @param provider - The provider to use
 * @returns array of transactions
 */
export async function getBlockRange(
  chain: string,
  accountAddress: string,
  fromBlock: number,
  toBlock: number,
  provider: JsonRpcProvider
): Promise<BlockchainTransaction[]> {
  const key =
    `${chain}:${accountAddress}[${fromBlock}-${toBlock}]`.toLowerCase();
  const cached = localStorage.getItem(key);
  // @ts-expect-error useCache is not defined in the window object
  if (cached && (!window.useCache || window.useCache !== false)) {
    const res = JSON.parse(cached);
    res.cached = true;
    return res;
  }
  // console.log(">>> skipping cache", key, cached, window.useCache);
  localStorage.removeItem(key); // remove previous cache
  console.log(
    "utils/crypto.ts: getBlockRange",
    chain,
    accountAddress,
    fromBlock,
    "to",
    toBlock
  );
  const topicsFrom = [
    ethers.id("Transfer(address,address,uint256)"), // Event signature
    ethers.zeroPadValue(accountAddress, 32),
  ];
  const topicsTo = [
    ethers.id("Transfer(address,address,uint256)"), // Event signature
    null,
    ethers.zeroPadValue(accountAddress, 32),
  ];

  let hasError = false;
  const logsFrom = await provider.getLogs({
    fromBlock,
    toBlock,
    topics: topicsFrom,
  });
  const logsTo = await provider.getLogs({
    fromBlock,
    toBlock,
    topics: topicsTo,
  });

  const logs = [...logsFrom, ...logsTo];

  const res = logs.map((log) => {
    try {
      const contract = new ethers.Contract(log.address, ERC20_ABI, provider);
      const parsedLog = contract.interface.parseLog(log);
      const from = parsedLog?.args[0].toLowerCase();
      const to = parsedLog?.args[1].toLowerCase();
      const value = parsedLog?.args[2].toString();
      return {
        blockNumber: log.blockNumber,
        txIndex: log.transactionIndex,
        logIndex: log.index,
        txHash: log.transactionHash,
        token: {
          address: log.address,
        },
        from,
        to,
        value,
      };
    } catch (error) {
      hasError = true;
      console.log("error parsing log", log, error);
      // e.g. https://gnosisscan.io/tx/0xf8162e7b3e5ed2691d1b7ba587108743230d7b98514d2f5c3a19899274b3cb8f (NFT spam)
      return null;
    }
  });
  res.sort((a, b) => {
    if (!a || !b) return 0;
    // First sort by block number
    if (a.blockNumber !== b.blockNumber) {
      return b.blockNumber - a.blockNumber;
    }
    // Then by transaction index
    if (a.txIndex !== b.txIndex) {
      return b.txIndex - a.txIndex;
    }
    // Finally by log index
    return b.logIndex - a.logIndex;
  });
  if (!hasError) setItem(key, JSON.stringify(res));
  return res.filter((tx) => tx !== null) as BlockchainTransaction[];
}

/**
 * Get the first and last block for an address
 * @param chain - The chain to get the block range for
 * @param address - The address to get the block range for
 * @returns { firstBlock: number, lastBlock: number | undefined }
 */
export async function getBlockRangeForAddress(
  chain: string,
  address: string
): Promise<null | { firstBlock: number; lastBlock: number | undefined }> {
  // const key = `${chain}:${address}`;
  // const cached = localStorage.getItem(key);
  // if (cached) {
  //   return JSON.parse(cached);
  // }

  const transactions = await getTransactionsFromEtherscan(chain, address);
  if (transactions) {
    const firstBlock = Number(transactions[0].blockNumber);
    const lastBlock =
      transactions.length < 10000
        ? Number(transactions[transactions.length - 1].blockNumber)
        : undefined;
    console.log(">>> blockRangeForAddress", address, firstBlock, lastBlock);
    // setItem(key, blockNumber.toString());
    return { firstBlock, lastBlock };
  } else {
    console.log(">>> no transactions found for", chain, address);
    return null;
  }
}
