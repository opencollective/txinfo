import {
  Address,
  Transaction,
  BlockchainTransaction,
  LogEvent,
  TxBatch,
  Chain,
  Token,
  TxHash,
} from "@/types";
import { setItem, TxReceipt } from "@/utils/crypto";
import { BlockchainDataProvider } from "@/utils/rpcProvider";
import { Client, createClient, OperationResponse } from "@stacks/blockchain-api-client";
import { paths as stacksApiPaths } from "@stacks/blockchain-api-client/lib/generated/schema";
import { Log } from "ethers";
import { createClient as createTokenClient } from "@hirosystems/token-metadata-api-client";
import { Client as TokenClient } from "@hirosystems/token-metadata-api-client";
import { paths as stacksTokenPaths } from "@hirosystems/token-metadata-api-client/lib/generated/schema";
import * as Stacks from "@/utils/crypto-stacks";

export class StacksDataProvider implements BlockchainDataProvider {
  client: Client<stacksApiPaths, `${string}/${string}`>;
  tokenClient: TokenClient<stacksTokenPaths, `${string}/${string}`>;

  constructor(rpcUrl: string) {
    this.client = createClient({
      baseUrl: rpcUrl,
    });

    this.tokenClient = createTokenClient({
      baseUrl: rpcUrl,
    });
  }
  async processBlockRange(
    chain: string,
    address: Address,
    fromBlock: number,
    toBlock: number
  ): Transaction[] | PromiseLike<Transaction[]> {
    const key =
      `${chain}:${address}[${fromBlock}-${toBlock}]-processed`.toLowerCase();
    // const cached = localStorage.getItem(key);
    // if (cached && (!window.useCache || window.useCache !== false)) {
    //   const res = JSON.parse(cached);
    //   res.cached = true;
    //   return res;
    // }
    localStorage.removeItem(key); // remove previous cache

    const txs = await this.getBlockRange(
      chain,
      address,
      fromBlock,
      toBlock,
      client
    );
    if (txs.length > 0) {
      const newTxs: Transaction[] = await Promise.all(
        txs.map(async (tx: BlockchainTransaction) => {
          const timestamp = await this.getBlockTimestamp(
            chain,
            tx.blockNumber,
            this.client
          );
          const token = await this.getTokenDetails(
            chain,
            tx.token.address as `${string}.${string}`
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
  getTxFromLog(chain: string, log: Log): Promise<BlockchainTransaction> {
    throw new Error("Method not implemented.");
  }
  getBlockNumber(): Promise<number> {
    return Stacks.getStacksHeight(this.client);
  }
  getLogs(filter: {
    fromBlock: number | undefined;
    toBlock: number;
    topics: (string | null)[];
  }): Promise<LogEvent[]> {
    throw new Error("Method not implemented.");
  }
  getTxBatch(blockNumber: number): Promise<TxBatch | null> {
    return this.client
      .GET(`/extended/v2/blocks/{height_or_hash}/transactions`, {
        params: {
          path: {
            height_or_hash: blockNumber,
          },
        },
      })
      .then((r) => r.data)
      .then(this.blockToTxBatch);
  }
  async getTransaction(txId: string): Promise<Transaction | null> {
    return this.client
      .GET(`/extended/v1/tx/{tx_id}`, {
        params: {
            path: {
                tx_id: txId
            }
        }
      })
            .then((r) => r.data)
            .then(this.txToTransaction) 
  }
  async getTxReceipt(chain: Chain, txId: string): Promise<TxReceipt | null> {
    const txResponse = await this.client.GET(`/extended/v1/tx/{tx_id}`, {
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

        console.log(tx.events);

        const ft_event = tx.events.find(
          (e) => e.event_type === "fungible_token_asset"
        );
        const stx_event = tx.events.find((e) => e.event_type === "stx_asset");
        const contract_address = ft_event
          ? ft_event.asset.asset_id.split("::")[0]
          : undefined;
        if (ft_event && !contract_address) {
          console.error("Transaction does not have a token:", txId);
          return null;
        }
        const res = {
          chainId: 1,
          hash: tx.tx_id,
          blockNumber,
          timestamp: tx.block_time,
          contract_address: ft_event
            ? contract_address
            : stx_event
            ? undefined
            : "no event",
          events: tx.events.map(this.eventToLogEvent),
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
  async getTokenDetails(chain: Chain, tokenAddress: Address): Promise<Token | null> {
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
        if (!Stacks.isContractAddress(tokenAddress)) {
          throw new Error(`Invalid contract address: ${tokenAddress}`);
        }
    
        const token = await this.tokenClient
          .GET("/metadata/v1/ft/{principal}", {
            params: {
              path: {
                principal: tokenAddress,
              },
            },
          })
          .then((r) => r.data as Token | undefined);
        if (!token || !token.name || !token.symbol || !token.decimals) {
          throw new Error(
            `Token details not found for contract address: ${tokenAddress}`
          );
        }
    
        const tokenDetails = {
          name: token.name,
          symbol: token.symbol,
          decimals: Number(token.decimals),
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



  blockToTxBatch = (
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

  txToTransaction = (tx: OperationResponse["/extended/v1/tx/{tx_id}"]
      | undefined) => {
    return {
        ...tx
    } as Transaction;
  }
  
  eventToLogEvent = (
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
  
}
