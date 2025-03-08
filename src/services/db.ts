import Dexie, { Table } from "dexie";
import { Event as NostrEvent } from "nostr-tools";
import { Transaction, URI, Address, TxHash } from "@/types";

// Define interfaces for our database tables
interface TransactionRecord extends Transaction {
  id?: number;
  uri: URI;
  chain: string;
  token_address: string;
  tx_hash: TxHash;
  timestamp: number;
  from: Address;
  to: Address;
  value: string;
  block_number: number;
  tx_index: number;
  log_index: number;
}

interface NostrEventRecord {
  id?: number;
  uri: URI;
  event_id: string; // Primary identifier (event.id)
  created_at: number; // Timestamp for sorting
  event: string; // Full event as JSON string
}

export class AppDatabase extends Dexie {
  transactions!: Table<TransactionRecord>;
  nostrEvents!: Table<NostrEventRecord>;

  constructor() {
    super("AppDatabase");

    this.version(1).stores({
      transactions:
        "++id, uri, chain, token_address, tx_hash, timestamp, from, to, value, [chain+from], [chain+to], [chain+block_number], tx_index, log_index, block_number",
      nostrEvents:
        "++id, parent_uri, pubkey, event_id, created_at, content, tags",
    });
  }

  // Transaction methods
  async bulkUpsertTransactions(
    transactions: Transaction[],
    chain: string
  ): Promise<void> {
    // Check which transactions already exist
    const existingTxHashes = await this.transactions
      .where("tx_hash")
      .anyOf(transactions.map((tx) => tx.txHash))
      .toArray()
      .then((txs) => new Set(txs.map((tx) => tx.txHash)));

    // Filter out existing transactions
    const newTxs = transactions
      .filter((tx) => !existingTxHashes.has(tx.txHash))
      .map((tx) => ({
        ...tx,
        chain,
      }));

    if (newTxs.length > 0) {
      await this.transactions.bulkAdd(newTxs);
    }
  }

  async getTransactionsByURI(
    chain: string,
    address: string
  ): Promise<Transaction[]> {
    const fromTxs = await this.transactions
      .where("[chain+from]")
      .equals([chain, address])
      .toArray();

    const toTxs = await this.transactions
      .where("[chain+to]")
      .equals([chain, address])
      .toArray();

    // Combine, deduplicate, and sort
    const txMap = new Map();
    [...fromTxs, ...toTxs].forEach((tx) => {
      txMap.set(tx.txHash, tx);
    });

    return Array.from(txMap.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  async getTransactionsByBlockRange(
    chain: string,
    fromBlock: number,
    toBlock: number
  ): Promise<Transaction[]> {
    return await this.transactions
      .where("[chain+blockNumber]")
      .between([chain, fromBlock], [chain, toBlock], true, true)
      .toArray();
  }

  async getTransactionsByTimeRange(
    chain: string,
    address: string,
    startTime: number,
    endTime: number
  ): Promise<Transaction[]> {
    const allTxs = await this.getTransactionsByAddress(chain, address);
    return allTxs.filter(
      (tx) => tx.timestamp >= startTime && tx.timestamp <= endTime
    );
  }

  async getTransactionsByToken(
    chain: string,
    tokenAddress: string
  ): Promise<Transaction[]> {
    return await this.transactions
      .where({ chain: chain, "token.address": tokenAddress })
      .sortBy("timestamp");
  }

  async getLatestBlockNumber(chain: string): Promise<number | null> {
    const tx = await this.transactions
      .where("chain")
      .equals(chain)
      .reverse()
      .sortBy("blockNumber");

    return tx.length > 0 ? tx[0].blockNumber : null;
  }

  // Nostr Event methods
  async addNostrEvent(uri: URI, event: NostrEvent): Promise<void> {
    // Check if event already exists
    const existing = await this.nostrEvents
      .where("event_id")
      .equals(event.id)
      .first();

    if (!existing) {
      await this.nostrEvents.add({
        event_id: event.id,
        created_at: event.created_at,
        uri,
        event: JSON.stringify(event),
      });
    }
  }

  async bulkAddNostrEvents(events: NostrEvent[]): Promise<void> {
    // Get existing event IDs
    const existingIds = await this.nostrEvents
      .where("eventId")
      .anyOf(events.map((e) => e.id))
      .toArray()
      .then((events) => new Set(events.map((e) => e.eventId)));

    // Filter and prepare events
    const newEvents = events
      .filter((e) => !existingIds.has(e.id))
      .map((event) => {
        // Extract metadata from event tags
        let chainId: number | undefined;
        let address: string | undefined;
        let txHash: string | undefined;

        const metadataTag = event.tags.find((tag) => tag[0] === "I");
        if (metadataTag && metadataTag[1]) {
          const parts = metadataTag[1].split(":");
          if (parts.length === 3) {
            chainId = parseInt(parts[0]);
            const type = parts[1];
            const value = parts[2];

            if (type === "address") {
              address = value;
            } else if (type === "tx") {
              txHash = value;
            }
          }
        }

        return {
          eventId: event.id,
          created_at: event.created_at,
          chainId,
          address,
          txHash,
          event: JSON.stringify(event),
        };
      });

    if (newEvents.length > 0) {
      await this.nostrEvents.bulkAdd(newEvents);
    }
  }

  async getNostrEventsByURI(uri: URI): Promise<NostrEvent[]> {
    const events = await this.nostrEvents
      .where("parent_uri")
      .equals(uri)
      .toArray();

    return events.map((e) => JSON.parse(e.event));
  }
  async getNostrEventsByURIs(uris: URI[]): Promise<NostrEvent[]> {
    const events = await this.nostrEvents
      .where("parent_uri")
      .anyOf(uris)
      .toArray();

    return events.map((e) => JSON.parse(e.event));
  }

  async getNostrEventsByEventId(eventId: string): Promise<NostrEvent | null> {
    const event = await this.nostrEvents
      .where("event_id")
      .equals(eventId)
      .first();

    return event ? JSON.parse(event.event) : null;
  }
}

// Create and export a singleton instance
export const db = new AppDatabase();
