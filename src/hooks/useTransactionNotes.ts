import { useState, useEffect, useCallback, useRef } from "react";
import { Event } from "nostr-tools";
import { useNostrPool } from "./nostr";
import { db } from "@/services/db";
import relays from "@/relays.json";

export function useTransactionNotes(chainId: number, subscriptionId: string) {
  const [notesByTxHash, setNotesByTxHash] = useState<{
    [txHash: string]: Event[];
  }>({});
  const [isLoading, setIsLoading] = useState(false);
  const pool = useNostrPool();
  const previousHashesRef = useRef<string[]>([]);
  const subRef = useRef<any>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (subRef.current) {
        try {
          subRef.current.close();
          subRef.current = null;
        } catch (e) {
          console.warn("Error in unmount cleanup:", e);
        }
      }
    };
  }, []);

  const updateTxHashes = useCallback(
    async (txHashes: string[]) => {
      // Skip if array length hasn't changed
      if (txHashes.length === previousHashesRef.current.length) {
        return;
      }

      // Update ref with new hashes
      previousHashesRef.current = txHashes;

      if (!txHashes.length) return;
      console.log(">>> calling updateTxHashes with", txHashes);
      setIsLoading(true);

      try {
        // First check local database
        const notesMap: { [txHash: string]: Event[] } = {};
        await Promise.all(
          txHashes.map(async (txHash) => {
            // Get events from database
            const type = txHash.length === 42 ? "address" : "tx";
            const events =
              type === "address"
                ? await db.getNostrEventsByAddress(chainId, txHash)
                : await db.getNostrEventsByTxHash(chainId, txHash);
            if (events.length > 0) {
              notesMap[txHash] = events;
            }
          })
        );

        // Update state with local data first
        setNotesByTxHash((prev) => ({ ...prev, ...notesMap }));

        // Then fetch from relays for any updates
        if (pool) {
          const filters = {
            kinds: [1111],
            "#I": txHashes.map(
              (txHash) =>
                `${chainId}:${
                  txHash.length === 42 ? "address" : "tx"
                }:${txHash}`
            ),
          };

          // If we already have a subscription, just update its filters
          if (subRef.current) {
            try {
              subRef.current.close();
            } catch (e) {
              console.warn("Error closing previous subscription:", e);
            }
          }

          const sub = pool.subscribeMany(relays, [filters], {
            onevent(event) {
              // Store event in database
              db.addNostrEvent(event).catch(console.error);

              // Update state
              setNotesByTxHash((prev) => {
                const txHash = event.tags
                  .find((tag) => tag[0] === "I")?.[1]
                  ?.split(":")?.[2];

                if (!txHash) return prev;

                const events = [...(prev[txHash] || [])];
                // Check if event already exists
                const exists = events.some((e) => e.id === event.id);
                if (!exists) {
                  events.push(event);
                  // Sort by created_at (newest first)
                  events.sort((a, b) => b.created_at - a.created_at);
                }

                return { ...prev, [txHash]: events };
              });
            },
            oneose() {
              setIsLoading(false);
            },
            id: subscriptionId,
          });

          subRef.current = sub;
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error fetching transaction notes:", error);
        setIsLoading(false);
      }
    },
    [chainId, pool, subscriptionId]
  );

  return { notesByTxHash, isLoading, updateTxHashes };
}
