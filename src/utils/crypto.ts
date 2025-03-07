"use client";

import { ethers } from "ethers";
import ERC20_ABI from "../erc20.abi.json";
import chains from "../chains.json";
import { useState, useEffect, useRef } from "react";
import { type TxHash, type Address } from "@/hooks/nostr";
import type { Token, Transaction } from "@/types/index.d.ts";
// const cache = {};
// const localStorage =
//   typeof window !== "undefined"
//     ? window.localStorage
//     : {
//         getItem: (key: string) => {
//           return cache[key];
//         },
//         setItem: (key: string, value: string) => {
//           cache[key] = value;
//         },
//       };

export const getBlockTimestamp = async (
  chain: string,
  blockNumber: number,
  provider: ethers.JsonRpcProvider
) => {
  const key = `${chain}:${blockNumber}`;
  const cached = localStorage.getItem(key);
  if (cached) {
    return JSON.parse(cached);
  }

  const block = await provider.getBlock(blockNumber);
  localStorage.setItem(key, block.timestamp.toString());
  return block.timestamp;
};

export function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export async function getTokenDetails(
  chain: string,
  contractAddress: string,
  provider: ethers.JsonRpcProvider
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

    const tokenDetails = {
      name,
      symbol,
      decimals: Number(decimals),
      address: contractAddress,
    };

    // Cache the result
    localStorage.setItem(
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

export function useTxDetails(chain: string, txHash: string) {
  const [txDetails, setTxDetails] = useState<Transaction | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const chainConfig = chains[chain as keyof typeof chains];
  if (!chainConfig) {
    throw new Error(`Chain not found: ${chain}`);
  }
  const provider = useRef(new ethers.JsonRpcProvider(chainConfig.rpc[0]));

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const tx = await getTxDetails(txHash, provider.current);
        const token = await getTokenDetails(
          chain,
          tx.contract_address,
          provider.current
        );
        setTxDetails({ ...tx, token });
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
        setIsLoading(false);
      }
    };

    fetchToken();
  }, [chain, txHash]);

  return [txDetails, isLoading, error] as const;
}

export async function getTxDetails(
  tx_hash: string,
  provider: ethers.JsonRpcProvider
) {
  const tx = await provider.getTransaction(tx_hash);
  if (!tx?.to) return null;

  if (localStorage.getItem(tx.hash)) {
    return JSON.parse(localStorage.getItem(tx.hash) || "{}");
  }

  const contract = new ethers.Contract(tx.to, ERC20_ABI, provider);
  const receipt = await provider.getTransactionReceipt(tx_hash);

  try {
    const decoded = contract.interface.parseTransaction({ data: tx.data });

    let contract_address = tx.to;
    let name = decoded?.name;
    let args = decoded?.args ? Array.from(decoded.args) : [];
    // Parse all logs from the receipt
    const events = receipt?.logs
      .map((log) => {
        try {
          // Create a new contract instance with the log's address
          const logContract = new ethers.Contract(
            log.address,
            ERC20_ABI,
            provider
          );
          const parsedLog = logContract.interface.parseLog({
            topics: log.topics,
            data: log.data,
          });

          // If we find a Transfer event, this is likely the main token contract
          if (parsedLog?.name === "Transfer") {
            contract_address = log.address;
            name = "Transfer";
            args = Array.from(parsedLog?.args || []);
          }

          return {
            name: parsedLog?.name,
            args: Array.from(parsedLog?.args || []),
            address: log.address,
          };
        } catch (error) {
          console.log("Could not parse log:", log);
          return null;
        }
      })
      .filter((e) => Boolean(e?.name)); // Remove null entries

    const res = {
      chainId: Number(tx.chainId),
      hash: tx.hash,
      contract_address, // This might be different from tx.to if it's a proxy
      name,
      args,
      events,
    };

    localStorage.setItem(
      tx.hash,
      JSON.stringify(res, (_, value) =>
        typeof value === "bigint" ? value.toString() : value
      )
    );

    return res;
  } catch (error) {
    console.error("Error decoding transaction:", error);
    return {
      contract_address: tx.to,
      from: tx.from,
      function: null,
      args: [],
      events: [],
    };
  }
}

export async function processBlockRange(
  chain: string,
  address: string,
  fromBlock: number,
  toBlock: number,
  provider: ethers.JsonRpcProvider
) {
  const key = `${chain}:${address}[${fromBlock}:${toBlock}]`.toLowerCase();
  const cached = localStorage.getItem(key);
  if (cached && (!window.useCache || window.useCache !== false)) {
    const res = JSON.parse(cached);
    res.cached = true;
    return res;
  }
  localStorage.removeItem(key); // remove previous cache

  const txs = await getBlockRange(chain, address, fromBlock, toBlock, provider);
  if (txs.length > 0) {
    const newTxs: Transaction[] = await Promise.all(
      txs.map(async (tx) => {
        const timestamp = await getBlockTimestamp(
          chain,
          tx.blockNumber,
          provider
        );
        const token = await getTokenDetails(chain, tx.contract, provider);
        return {
          ...tx,
          timestamp,
          token,
        };
      })
    );
    localStorage.setItem(key, JSON.stringify(newTxs));
    return newTxs;
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
export const getBlockRange = async (
  chain: string,
  accountAddress: string,
  fromBlock: number,
  toBlock: number,
  provider: ethers.JsonRpcProvider
) => {
  const key =
    `${chain}:${accountAddress}[${fromBlock}-${toBlock}]`.toLowerCase();
  const cached = localStorage.getItem(key);
  if (cached && (!window.useCache || window.useCache !== false)) {
    const res = JSON.parse(cached);
    res.cached = true;
    return res;
  }
  console.log(">>> skipping cache", key, cached, window.useCache);
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
        contract: log.address,
        from,
        to,
        value,
      };
    } catch (error) {
      hasError = true;
      console.log("error parsing log", log, error);
      return null;
    }
  });
  res.sort((a, b) => {
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
  if (!hasError) localStorage.setItem(key, JSON.stringify(res));
  return res;
};

export async function isEOA(
  chain: string,
  address: string,
  provider: ethers.JsonRpcProvider
) {
  const key = `${chain}:${address}:eoa`;
  const cached = localStorage.getItem(key);
  if (cached) {
    return cached === "1";
  }
  const code = await provider.getCode(address);

  if (code === "0x") {
    console.log(`${address} is an EOA (Externally Owned Account).`);
    localStorage.setItem(key, "1");
    return true;
  } else {
    console.log(`${address} is a Smart Contract.`);
    localStorage.setItem(key, "0");
    return false;
  }
}

export async function getBlockRangeForAddress(
  chain: string,
  address: string,
  provider: ethers.JsonRpcProvider
): Promise<null | { firstBlock: number; lastBlock: number | undefined }> {
  // const key = `${chain}:${address}:firstBlock`;
  // const cached = localStorage.getItem(key);
  // if (cached) {
  //   return JSON.parse(cached);
  // }

  // const isAccountEOA = await isEOA(chain, address, provider);
  // console.log(">>> isAccountEOA", address, isAccountEOA);
  // let apicall;
  // if (isAccountEOA) {
  const apicall = `/api/etherscan/account?address=${address}&chain=${chain}`;
  // } else {
  //   apicall = `/api/etherscan/contract?address=${address}&chain=${chain}`;
  // }
  const response = await fetch(apicall);
  const data = await response.json();
  if (data.status === "1") {
    const firstBlock = Number(data.result[0].blockNumber);
    const lastBlock =
      data.result.length < 10000
        ? Number(data.result[data.result.length - 1].blockNumber)
        : undefined;
    console.log(">>> blockRangeForAddress", address, firstBlock, lastBlock);
    // localStorage.setItem(key, blockNumber.toString());
    return { firstBlock, lastBlock };
  } else {
    console.log(">>> error from /api/etherscan", data);
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

        const provider = new ethers.JsonRpcProvider(chainConfig.rpc[0]);
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
