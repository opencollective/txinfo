import { LogEvent, TxHash } from "@/types";
import { OperationResponse } from "@stacks/blockchain-api-client";
import { TxReceipt } from "./crypto";

export const blockToTxBatch = (
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

export const eventToLogEvent = (
  event: OperationResponse["/extended/v1/tx/events"]["events"][0]
) => {
  // tx.from = event.args[0] as Address;
  // tx.to = event.args[1] as Address;
  // tx.value = event.args[2];

  switch (event.event_type) {
    case "smart_contract_log":
      return {
        name: event.contract_log.topic,
        args: [event.contract_log.value.repr],
        address: event.contract_log.contract_id,
      };
    case "fungible_token_asset":
      return {
        name:
          event.asset.asset_event_type === "transfer"
            ? "Transfer"
            : event.asset.asset_event_type,
        args: [
          event.asset.sender,
          event.asset.recipient,
          event.asset.amount.toString(),
          event.asset.asset_id,
        ],
        address: event.asset.asset_id.split("::")[0],
      } as LogEvent;
    case "non_fungible_token_asset":
      return {
        name: event.asset.asset_event_type,
        args: [
          "nft",
          event.asset.sender,
          event.asset.recipient,
          event.asset.value,
          event.asset.asset_id,
        ],
        address: event.asset.asset_id.split("::")[0],
      };
    case "stx_asset":
      return {
        name: event.asset.asset_event_type,
        args: [
          event.asset.sender,
          event.asset.recipient,
          event.asset.amount.toString(),
        ],
        address: "STX", // STX is a special case, no contract address
      };
    default:
      console.warn("Unknown event type:", event.event_type);
  }
};
