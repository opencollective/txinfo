"use client";

import type {
  Address,
  BlockchainTransaction,
  Chain,
  ChainConfig,
  EtherscanTransfer,
  LogEvent,
  Token,
  Transaction,
  TxHash,
} from "@/types/index.d.ts";
import { ethers, JsonRpcProvider, Log } from "ethers";
import { useEffect, useRef, useState } from "react";
import chains from "../chains.json";
import ERC20_ABI from "../erc20.abi.json";
import * as crypto from "./crypto.server";
import { createProvider, TxBatchProvider } from "./rpcProvider";
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

export const setItem = (key: string, value: string) => {
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
  chain: Chain,
  blockNumber: number,
  provider: TxBatchProvider
) => {
  const key = `${String(chain)}:${blockNumber}`;
  const cached = localStorage.getItem(key);
  if (cached) {
    return JSON.parse(cached);
  }

  const block = await provider.getTxBatch(blockNumber);
  if (!block) {
    throw new Error(`Block not found: ${blockNumber}`);
  }
  setItem(key, block.timestamp.toString());
  return block.timestamp;
};

export async function getTokenDetails(
  chain: string,
  contractAddress: string,
  provider: JsonRpcProvider
) {
  try {
    // Check cache first
    const key = `${chain}:${contractAddress}`;
    const cached = localStorage.getItem(key);
    if (cached) {
      const res = JSON.parse(cached);
      res.cached = true;
      return res;
    }

    // Validate contract address
    if (!ethers.isAddress(contractAddress)) {
      throw new Error(`Invalid contract address: ${contractAddress}`);
    }

    const contract = new ethers.Contract(contractAddress, ERC20_ABI, provider);

    const [name, symbol, decimals] = await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.decimals(),
    ]);

    const tokenDetails: Token = {
      name,
      symbol,
      decimals: Number(decimals),
      address: contractAddress as Address,
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
      address: contractAddress,
    };
  }
}
interface TxDetails extends BlockchainTransaction {
  token: Token;
  events: LogEvent[];
}

export function useTxDetails(chain: Chain, txId?: string) {
  const [txDetails, setTxDetails] = useState<TxDetails | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const chainConfig = chains[chain as keyof typeof chains] as ChainConfig;
  if (!chainConfig) {
    throw new Error(`Chain not found: ${String(chain)}`);
  }
  const provider = useRef(
    createProvider({
      type: chainConfig.type,
      rpcUrl: chainConfig.rpc[0],
    })
  );

  useEffect(() => {
    const fetchToken = async () => {
      console.log("useTxDetails", chain, txId);
      if (!txId) {
        setError(new Error("Transaction id is required"));
        setIsLoading(false);
        return;
      }
      try {
        const txReceipt = await provider.current.getTxReceipt(chain, txId);
        if (!txReceipt) {
          setError(new Error("Transaction not found"));
          setIsLoading(false);
          return;
        }
        const token = await provider.current.getTokenDetails(
          chain,
          txReceipt.contract_address
        );
        if (!token) {
          setError(new Error("Token not found"));
          setIsLoading(false);
          return;
        }
        const tx: Partial<Transaction> = {
          token,
          timestamp: txReceipt.timestamp,
          txId: txReceipt.hash as TxHash,
        };
        txReceipt.events.forEach((event: LogEvent) => {
          if (event.name === "Transfer") {
            tx.from = event.args[0] as Address;
            tx.to = event.args[1] as Address;
            tx.value = event.args[2];
          }
        });
        setTxDetails(tx as TxDetails);
        setIsLoading(false);
      } catch (err) {
        // Optional, for EVM providers
        setError(err instanceof Error ? err : new Error("Unknown error"));
        setIsLoading(false);
      }
    };
    fetchToken();
  }, [chain, txId]);

  return [txDetails, isLoading, error] as const;
}

export async function getAddressType(
  chain: string,
  address: string,
  provider: JsonRpcProvider
): Promise<"eoa" | "contract" | "token" | undefined> {
  const key = `${chain}:${address}:type`;
  const cached = localStorage.getItem(key);
  if (cached) {
    return cached as "eoa" | "contract" | "token";
  }
  const code = await provider.getCode(address);
  let res: "eoa" | "contract" | "token" | undefined;
  if (code === "0x") {
    console.log(`${address} is an EOA (Externally Owned Account).`);
    res = "eoa";
  } else {
    console.log(`${address} is a Smart Contract.`);

    // Proxy-related signatures and patterns
    const proxySlotSig =
      "360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"; // ERC-1967 implementation slot

    // Check if it's a proxy
    const isProxy = code.includes(proxySlotSig);

    if (isProxy) {
      // For proxies, we should check the implementation contract
      try {
        const contract = new ethers.Contract(address, ERC20_ABI, provider);
        await Promise.all([
          contract.name(),
          contract.symbol(),
          contract.decimals(),
        ]);
        res = "token"; // If ERC20 calls succeed, it's a token proxy
      } catch {
        console.log(">>> isERC20Proxy", address, "failed");
        res = "contract"; // If ERC20 calls fail, it's some other kind of proxy
      }
    } else {
      // Common ERC20 function signatures
      const transferSig = "a9059cbb"; // transfer(address,uint256)
      const balanceOfSig = "70a08231"; // balanceOf(address)
      const totalSupplySig = "18160ddd"; // totalSupply()

      // Check if the bytecode contains these signatures
      const hasTransfer = code.includes(transferSig);
      const hasBalanceOf = code.includes(balanceOfSig);
      const hasTotalSupply = code.includes(totalSupplySig);

      // If it has at least these core ERC20 functions, it's likely a token
      if (hasTransfer && hasBalanceOf && hasTotalSupply) {
        res = "token";
      } else {
        res = "contract";
      }
    }
  }
  setItem(key, res);
  return res;
}

export type TxReceipt = {
  chainId: number;
  hash: string;
  blockNumber: number;
  timestamp: number;
  events: LogEvent[];
  contract_address: string;
};

/**
 * Get the transactions in a block range from or to an address (sorted by time DESC, so newest first)
 * @param chain - The chain to get the block range for
 * @param address - The address to get the block range for
 * @param fromBlock - The starting block
 * @param toBlock - The ending block
 * @param provider - The provider to use
 */
export async function processBlockRange(
  chain: Chain,
  address: Address,
  fromBlock: number,
  toBlock: number,
  provider: TxBatchProvider
): Promise<Transaction[]> {
  const key = `${String(
    chain
  )}:${address}[${fromBlock}-${toBlock}]-processed`.toLowerCase();
  // const cached = localStorage.getItem(key);
  // if (cached && (!window.useCache || window.useCache !== false)) {
  //   const res = JSON.parse(cached);
  //   res.cached = true;
  //   return res;
  // }
  localStorage.removeItem(key); // remove previous cache

  const txs = await provider.getBlockRange(chain, address, fromBlock, toBlock);
  if (txs.length > 0) {
    const newTxs = await Promise.all(
      txs.map(async (tx: Transaction) => {
        const timestamp = await getBlockTimestamp(
          chain,
          tx.blockNumber,
          provider
        );
        const token = await provider.getTokenDetails(chain, tx.token.address);
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

export async function getTxFromLog(
  chain: string,
  log: Log,
  provider: JsonRpcProvider
): Promise<BlockchainTransaction> {
  const contract = new ethers.Contract(log.address, ERC20_ABI, provider);
  const parsedLog = contract.interface.parseLog(log);
  const from = parsedLog?.args[0].toLowerCase() as Address;
  const to = parsedLog?.args[1].toLowerCase() as Address;
  const value = parsedLog?.args[2].toString();
  const block = await provider.getBlock(log.blockNumber);
  const token = await getTokenDetails(chain, log.address, provider);
  const tx = {
    blockNumber: log.blockNumber,
    timestamp: block?.timestamp as number,
    txIndex: log.transactionIndex,
    logIndex: log.index,
    txHash: log.transactionHash as TxHash,
    token,
    from,
    to,
    value,
  };
  return tx;
}

/**
 * Get the first and last block for an address
 * @param chain - The chain to get the block range for
 * @param address - The address to get the block range for
 * @returns { firstBlock: number, lastBlock: number | undefined }
 */
export async function getBlockRangeForAddress(
  chain: Chain,
  address: Address
): Promise<null | { firstBlock: number; lastBlock: number | undefined }> {
  // const key = `${chain}:${address}`;
  // const cached = localStorage.getItem(key);
  // if (cached) {
  //   return JSON.parse(cached);
  // }

  const transactions = await getTransactionsFromEtherscan(
    String(chain),
    address
  );
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

const convertEtherscanDataToTransactionType = (data: EtherscanTransfer[]) => {
  if (!Array.isArray(data)) return [];
  return data.map((tx: EtherscanTransfer) => ({
    blockNumber: Number(tx.blockNumber),
    txHash: tx.hash,
    txIndex: Number(tx.transactionIndex),
    timestamp: Number(tx.timeStamp),
    from: tx.from,
    to: tx.to,
    value: tx.value,
    token: {
      address: tx.contractAddress,
      name: tx.tokenName,
      decimals: Number(tx.tokenDecimal) || 18,
      symbol: tx.tokenSymbol,
    },
  }));
};

export async function getTransactionsFromEtherscan(
  chain: string,
  address?: string,
  tokenAddress?: string
): Promise<null | BlockchainTransaction[]> {
  const key = `${chain}:${address}${
    tokenAddress ? `:${tokenAddress}` : ""
  }`.toLowerCase();
  const cached = localStorage.getItem(key);
  if (cached) {
    const cachedObject = JSON.parse(cached);
    if (cachedObject.transactions.length === 0 || cachedObject.version !== 1) {
      localStorage.removeItem(key);
    } else {
      if (cachedObject.timestamp > Date.now() - 1000 * 60 * 60) {
        console.log(">>> getTransactionsFromEtherscan: cache hit", key);

        return cachedObject.transactions;
      } else if (
        cachedObject.timestamp >
        Date.now() - 1000 * 60 * 60 * 24 * 7
      ) {
        // 7 days
        // We return the cached transactions and update the cache
        console.log(">>> getTransactionsFromEtherscan: updating cache", key);
        localStorage.removeItem(key);
        getTransactionsFromEtherscan(chain, address, tokenAddress);
        return cachedObject.transactions;
      }
    }
  }

  const params = new URLSearchParams({
    chain,
    module: "account",
    action: "tokentx",
    startblock: "0",
    endblock: "99999999",
    sort: "desc",
  });

  // Add optional filters
  if (address) {
    const provider = new JsonRpcProvider(
      chains[chain as keyof typeof chains].rpc[0]
    );
    const addressType = await getAddressType(chain, address, provider);
    switch (addressType) {
      case "eoa":
      case "contract":
        params.set("address", address);
        break;
      case "token":
        params.set("contractaddress", address);
        break;
    }
  }
  if (tokenAddress) {
    params.set("contractaddress", tokenAddress);
  }

  const apicall = `${
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_WEBSITE_URL
  }/api/etherscan?${params.toString()}`;
  const response = await fetch(apicall);
  try {
    const data = await response.json();
    const res = convertEtherscanDataToTransactionType(data);
    if (res.length > 0) {
      setItem(
        key,
        JSON.stringify({ transactions: res, timestamp: Date.now(), version: 1 })
      );
      return res;
    } else {
      console.log(
        ">>> getTransactionsFromEtherscan: no transactions found",
        key
      );
      return null;
    }
  } catch (e) {
    console.error("Error in getTransactionsFromEtherscan:", e);
    return null;
  }
}

export function useTokenDetails(chain: string, contractAddress: string) {
  const [token, setToken] = useState<{
    name: string;
    symbol: string;
    decimals: number;
    address: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      if (!chain || !contractAddress) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const chainConfig = chains[chain as keyof typeof chains];
        if (!chainConfig) {
          throw new Error(`Chain not found: ${chain}`);
        }

        const provider = new JsonRpcProvider(chainConfig.rpc[0]);
        const tokenDetails = await getTokenDetails(
          chain,
          contractAddress,
          provider
        );

        setToken(tokenDetails);
      } catch (err) {
        console.error("Error in useTokenDetails:", err);
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchToken();
  }, [chain, contractAddress]);

  return [token, isLoading, error] as const;
}
