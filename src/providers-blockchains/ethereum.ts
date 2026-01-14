"use client";

import { setItem, TxReceipt } from "@/utils/crypto";
import * as crypto from "@/utils/crypto.server";
import {
  Block,
  ethers,
  JsonRpcProvider,
  Log,
  TransactionResponse,
} from "ethers";
import ERC20_ABI from "../erc20.abi.json";
import {
  Address,
  BlockchainTransaction,
  Chain,
  HexString,
  LogEvent,
  Token,
  Transaction,
  TxBatch,
  TxHash,
} from "../types/index";
import { BlockchainDataProvider } from "../utils/rpcProvider";

export const truncateAddress = crypto.truncateAddress;

export class EthereumDataProvider implements BlockchainDataProvider {
  provider: JsonRpcProvider;

  constructor(rpcUrl: string) {
    this.provider = new JsonRpcProvider(rpcUrl);
  }

  async getTxFromLog(chain: Chain, log: Log): Promise<BlockchainTransaction> {
    const contract = new ethers.Contract(log.address, ERC20_ABI, this.provider);
    const parsedLog = contract.interface.parseLog(log);
    const from = parsedLog?.args[0].toLowerCase() as Address;
    const to = parsedLog?.args[1].toLowerCase() as Address;
    const value = parsedLog?.args[2].toString();
    const block = await this.provider.getBlock(log.blockNumber);
    const token = (await this.getTokenDetails(
      chain,
      log.address as Address
    )) as Token;
    if (!token) {
      throw new Error(`invalid token ${log.address}`);
    }
    const tx = {
      blockNumber: log.blockNumber,
      timestamp: block?.timestamp as number,
      txIndex: log.transactionIndex,
      logIndex: log.index,
      txId: log.transactionHash as TxHash,
      token,
      from,
      to,
      value,
    };
    return tx;
  }
  getBlockNumber(): Promise<number> {
    return this.provider.getBlockNumber();
  }
  getLogs(filter: {
    fromBlock: number | undefined;
    toBlock: number;
    topics: (string | null)[];
  }): Promise<LogEvent[]> {
    return this.provider
      .getLogs(filter)
      .then((logs) => logs.map((log) => this.logToLogEvent(log)));
  }

  getTxBatch(blockNumber: number): Promise<TxBatch | null> {
    return this.provider.getBlock(blockNumber).then(this.blockToTxBatch);
  }

  getTransaction(txId: string): Promise<Transaction | null> {
    return this.provider.getTransaction(txId).then(this.txToTransaction);
  }

  async getTxReceipt(chain: Chain, txId: string): Promise<TxReceipt | null> {
    const tx = await this.provider.getTransaction(txId);
    if (!tx?.to) return null;

    if (localStorage.getItem(`TxReceipt:${tx.hash}`)) {
      return JSON.parse(localStorage.getItem(`TxReceipt:${tx.hash}`) || "{}");
    }

    const contract = new ethers.Contract(tx.to, ERC20_ABI, this.provider);
    const receipt = await this.provider.getTransactionReceipt(txId);

    if (!receipt) return null;
    const blockNumber = receipt?.blockNumber;
    const timestamp = await this.getBlockTimestamp(chain, blockNumber);

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
            this.provider
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
  async getTokenDetails(
    chain: Chain,
    tokenAddress: Address
  ): Promise<Token | null> {
    try {
      // Check cache first
      const key = `${chain}:${tokenAddress}`;
      const cached = localStorage.getItem(key);
      if (cached) {
        const res = JSON.parse(cached);
        res.cached = true;
        return res;
      }

      // Validate contract address
      if (!ethers.isAddress(tokenAddress)) {
        throw new Error(`Invalid contract address: ${tokenAddress}`);
      }

      const contract = new ethers.Contract(
        tokenAddress,
        ERC20_ABI,
        this.provider
      );

      const [name, symbol, decimals] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.decimals(),
      ]);

      const tokenDetails: Token = {
        name,
        symbol,
        decimals: Number(decimals),
        address: tokenAddress,
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
        address: tokenAddress,
      };
    }
  }
  getBlockRange(
    chain: Chain,
    address: Address,
    startBlock: number,
    endBlock: number
  ): Promise<BlockchainTransaction[]> {
    throw new Error("Method not implemented.");
  }

  getBlockTimestamp = async (chain: Chain, blockNumber: number) => {
    const key = `${String(chain)}:${blockNumber}`;
    const cached = localStorage.getItem(key);
    if (cached) {
      return JSON.parse(cached);
    }

    const block = await this.getTxBatch(blockNumber);
    if (!block) {
      throw new Error(`Block not found: ${blockNumber}`);
    }
    setItem(key, block.timestamp.toString());
    return block.timestamp;
  };

  blockToTxBatch = (block: Block | null): TxBatch | null => {
    return block
      ? {
          txs: block.transactions.map((tx) => {
            return tx as TxHash;
          }),
          timestamp: block.timestamp * 1000, // Convert to milliseconds
        }
      : null;
  };

  txToTransaction = (tx: TransactionResponse | null): Transaction | null => {
    if (tx === null) {
      return null;
    }

    return {
      txId: tx.hash as TxHash,
      // TODO
      timestamp: 0,
      from: tx.from as HexString<42>,
      to: tx.to as HexString<42>,
      value: tx.value.toString(),
      // TODO
      token: {
        address: "0x0123456789abcdef0123456789abcdef01234567" as HexString<42>,
      },
    };
  };

  logToLogEvent = (log: Log): LogEvent => {
    return {
      address: log.address,
      args: [], // TODO
      name: "Transfer",
    };
  };
}
