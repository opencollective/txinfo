import {
  BlockchainTransaction,
  HexString,
  LogEvent,
  Transaction,
  TxBatch,
  TxHash,
} from "@/types";
import { Block, Log, TransactionResponse } from "ethers";
import { getBlockTimestamp } from "./crypto";

export function blockToTxBatch(block: Block | null): TxBatch | null {
  return block
    ? {
        txs: block.transactions.map((tx) => {
          return tx as TxHash;
        }),
        timestamp: block.timestamp * 1000, // Convert to milliseconds
      }
    : null;
}

export function txToTransaction(
  tx: TransactionResponse | null
): Transaction | null {
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
}

export function logToLogEvent(log: Log): LogEvent {
  return {
    address: log.address,
    args: [], // TODO
    name: "Transfer",
  };
}
