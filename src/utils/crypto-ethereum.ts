"use client";

import { ethers, JsonRpcProvider, Log } from "ethers";
import ERC20_ABI from "../erc20.abi.json";
import * as crypto from "./crypto.server";
import { setItem, TxReceipt } from "./crypto";
import { Address, Token } from "@/types";
export const truncateAddress = crypto.truncateAddress;

export async function getTxReceipt(
  chain: string,
  tx_hash: string,
  provider: JsonRpcProvider
): Promise<TxReceipt | null> {
  const tx = await provider.getTransaction(tx_hash);
  if (!tx?.to) return null;

  if (localStorage.getItem(`TxReceipt:${tx.hash}`)) {
    return JSON.parse(localStorage.getItem(`TxReceipt:${tx.hash}`) || "{}");
  }

  const contract = new ethers.Contract(tx.to, ERC20_ABI, provider);
  const receipt = await provider.getTransactionReceipt(tx_hash);

  if (!receipt) return null;
  const blockNumber = receipt?.blockNumber;
  const timestamp = await getBlockTimestamp(chain, blockNumber, provider);

  try {
    const decoded = contract.interface.parseTransaction({ data: tx.data });

    let contract_address = tx.to;
    // Parse all logs from the receipt
    const processLog = (log: Log) => {
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
        }

        return {
          name: parsedLog?.name,
          args: Array.from(parsedLog?.args || []),
          address: log.address,
        };
      } catch (err) {
        console.log("Could not parse log:", log, err);
        return null;
      }
    };

    const events = receipt?.logs.map(processLog);
    const filteredEvents = events.filter((e) => Boolean(e?.name)); // Remove null entries

    const res = {
      chainId: Number(tx.chainId),
      hash: tx.hash,
      blockNumber,
      timestamp,
      contract_address, // This might be different from tx.to if it's a proxy
      events: filteredEvents,
    };

    setItem(
      `TxReceipt:${tx.hash}`,
      JSON.stringify(res, (_, value) =>
        typeof value === "bigint" ? value.toString() : value
      )
    );

    return res as TxReceipt;
  } catch (error) {
    console.error("Error decoding transaction:", error);
    return {
      chainId: Number(tx.chainId),
      hash: tx.hash,
      blockNumber,
      timestamp,
      contract_address: tx.to as Address,
      events: [],
    };
  }
}

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

export async function getTokenDetails(
  chain: string,
  contractAddress: Address,
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
      address: contractAddress,
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
