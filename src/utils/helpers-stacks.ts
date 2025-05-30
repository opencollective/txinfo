import { TxHash } from "@/types";
import { OperationResponse } from "@stacks/blockchain-api-client";
import { time } from "console";

export const stacksBlockResponseToTxBatch = (
  blockResponse:
    | OperationResponse["/extended/v2/blocks/{height_or_hash}/transactions"]
    | undefined
) => {
  if (!blockResponse || !blockResponse.results) {
    return null;
  }
  return {
    txs: blockResponse.results.map((tx) => {
      return tx.tx_id as TxHash;
    }),
    timestamp: blockResponse.results[0]?.block_time,
  };
};
