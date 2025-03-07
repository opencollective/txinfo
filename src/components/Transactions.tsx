"use client";

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { ethers, formatEther, JsonRpcProvider } from "ethers";
import {
  processBlockRange,
  getBlockRangeForAddress,
  truncateAddress,
} from "../utils/crypto";
import chains from "../chains.json";
import { Button } from "@/components/ui/button";
import React from "react";
import { TransactionRow } from "@/components/TransactionRow";
import { type Address, type TxHash } from "@/hooks/nostr";

import {
  format,
  startOfMonth,
  endOfMonth,
  startOfToday,
  isWithinInterval,
} from "date-fns";

import { Progress } from "@/components/ui/progress";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandList,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import type { Token } from "@/types/index.d.ts";

interface Props {
  address: string;
  chain: string;
}

const LIMIT_PER_PAGE = 50;
import { type Transaction } from "@/utils/crypto";
import { URI, useNostr } from "@/providers/NostrProvider";
import StatsCards from "./StatsCards";
import Filters, { type Filter } from "./Filters";

export default function Transactions({ address, chain }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [progress, setProgress] = useState<{
    fromBlock: number;
    toBlock: number;
    lastBlock: number;
    firstBlock: number;
  }>({ fromBlock: 0, toBlock: 0, lastBlock: 0, firstBlock: 0 });
  const [transactionsFilter, setTransactionsFilter] = useState<Filter>({
    dateRange: {
      start: startOfMonth(new Date()),
      end: endOfMonth(new Date()),
      label: format(new Date(), "MMMM yyyy"),
    },
    selectedTokens: [],
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const chainConfig = chains[chain as keyof typeof chains];
  const rpc =
    typeof chainConfig.rpc === "string" ? [chainConfig.rpc] : chainConfig.rpc;
  const provider = useRef<JsonRpcProvider>(new JsonRpcProvider(rpc[0]));
  const limit = 10000;
  let errorCount = 0;

  // Get unique token symbols from transactions
  const availableTokens = useMemo(() => {
    if (!transactions || !Array.isArray(transactions)) {
      console.log("No transactions or invalid format:", transactions);
      return [];
    }

    try {
      const tokenMap: Record<Address, Token> = {};
      transactions.forEach((tx) => {
        if (tx.token?.address) {
          tokenMap[tx.token.address] = tx.token;
        }
      });
      return Object.values(tokenMap);
    } catch (error) {
      console.error("Error processing tokens:", error);
      return [];
    }
  }, [transactions]);

  // Filter transactions based on both date and tokens
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];

    let filtered = transactions;

    // Apply date filter
    if (
      transactionsFilter.dateRange.start &&
      transactionsFilter.dateRange.end
    ) {
      filtered = filtered.filter((tx) => {
        const txDate = new Date(tx.timestamp * 1000);
        return isWithinInterval(txDate, {
          start: transactionsFilter.dateRange.start!,
          end: transactionsFilter.dateRange.end!,
        });
      });
    }

    // Apply token filter
    if (transactionsFilter.selectedTokens.length > 0) {
      filtered = filtered.filter(
        (tx) =>
          tx?.token &&
          tx.token?.address &&
          transactionsFilter.selectedTokens
            .map((t) => t.address)
            .includes(tx.token.address)
      );
    }

    return filtered;
  }, [transactions, transactionsFilter]);

  useEffect(() => {
    const cachedTransactions = localStorage.getItem(
      `${chain}:${address}:transactions`
    );
    // if (cachedTransactions) {
    //   const txs = JSON.parse(cachedTransactions);
    //   console.log("txs", txs);
    //   setTransactions(
    //     txs.filter(
    //       (tx: Transaction, index: number, self: Transaction[]) =>
    //         index === self.findIndex((t) => t.txHash === tx.txHash)
    //     )
    //   );
    // }

    const fetchAllTransactions = async () => {
      setIsLoading(true);
      try {
        const blockRange = await getBlockRangeForAddress(
          chain,
          address,
          provider.current
        );

        const lastBlock =
          blockRange.lastBlock || (await provider.current.getBlockNumber());
        let fromBlock = lastBlock - (lastBlock % limit);
        let toBlock = lastBlock;
        const firstBlock = blockRange?.firstBlock || 1;
        console.log(">>> firstBlock", firstBlock);
        console.log(">>> lastBlock", lastBlock);
        console.log(">>> fromBlock", fromBlock);
        console.log(">>> toBlock", toBlock);
        setProgress({
          fromBlock,
          toBlock,
          lastBlock,
          firstBlock,
        });

        while (toBlock > 0 && fromBlock >= firstBlock - limit) {
          try {
            const newTxs = await processBlockRange(
              chain,
              address,
              fromBlock,
              toBlock,
              provider.current
            );
            // Update progress
            setProgress({
              fromBlock,
              toBlock,
              lastBlock,
              firstBlock,
            });

            if (newTxs && newTxs.length > 0) {
              // Update state with all transactions so far
              setTransactions((prevTxs) => {
                const uniques = newTxs.filter((tx) => {
                  const isDuplicate = prevTxs.some(
                    (t) => t.txHash === tx.txHash
                  );
                  if (isDuplicate) {
                    console.log("!!! duplicate", tx);
                  }
                  return !isDuplicate;
                });

                return [...prevTxs, ...uniques];
              });
            }
            toBlock = fromBlock - 1;
            fromBlock = fromBlock - limit;
          } catch (error) {
            errorCount++;
            console.error("Error fetching transactions:", error);
            if (errorCount >= rpc.length) {
              throw new Error("All RPCs failed");
            }
            console.log(
              "Transactions.tsx: fetchAllTransactions> errorCount",
              errorCount,
              "switching to rpc",
              rpc[errorCount % rpc.length]
            );
            provider.current = new JsonRpcProvider(
              rpc[errorCount % rpc.length]
            );
          }
        }

        // Store in localStorage
        localStorage.setItem(
          `${chain}:${address}:transactions`,
          JSON.stringify(transactions)
        );
      } catch (error) {
        console.error("Error fetching transactions:", error);
        setError("Unable to load transactions. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllTransactions();
  }, [address, chain]);

  // Subscribe to notes for all transactions at once
  const { notesByURI, subscribeToNotesByURI } = useNostr();

  // Initial load
  useEffect(() => {
    const uris = new Set<URI>();
    filteredTransactions.slice(0, LIMIT_PER_PAGE).forEach((tx: Transaction) => {
      uris.add(`${chainConfig.id}:address:${tx.from}`);
      uris.add(`${chainConfig.id}:address:${tx.to}`);
      uris.add(`${chainConfig.id}:tx:${tx.txHash}`);
    });

    subscribeToNotesByURI(Array.from(uris) as URI[]);
  }, [filteredTransactions]);

  // Calculate transaction statistics based on filtered transactions

  // Calculate progress percentage
  const progressPercentage = useMemo(() => {
    if (!progress.firstBlock || !progress.lastBlock) return 0;
    const totalBlocks = progress.lastBlock - progress.firstBlock;
    const scannedBlocks = progress.lastBlock - progress.fromBlock;
    return Math.min(Math.round((scannedBlocks / totalBlocks) * 100), 100);
  }, [progress]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Filters
        availableTokens={availableTokens}
        onChange={setTransactionsFilter}
      />

      {/* Stats Cards */}
      <StatsCards
        accountAddress={address as Address}
        transactions={filteredTransactions}
        tokens={
          availableTokens.length === 1
            ? availableTokens
            : transactionsFilter.selectedTokens
        }
        timeRangeLabel={transactionsFilter.dateRange.label}
      />

      {/* Transactions List */}
      {filteredTransactions.map((tx, idx) => {
        return (
          <TransactionRow
            key={idx}
            tx={tx}
            chain={chain}
            chainId={chainConfig.id}
            expanded={expandedTx === tx.txHash}
            onToggleExpand={() =>
              setExpandedTx(expandedTx === tx.txHash ? null : tx.txHash)
            }
          />
        );
      })}

      {/* Progress Bar */}
      {isLoading && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-sm border-t">
          <div className="container max-w-7xl mx-auto space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                Scanning blocks{" "}
                {(progress.lastBlock - progress.toBlock).toLocaleString()} /{" "}
                {(progress.lastBlock - progress.firstBlock).toLocaleString()}
              </span>
              <span>{progressPercentage}%</span>
            </div>
            <Progress value={progressPercentage} className="w-full" />
          </div>
        </div>
      )}
      {error && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-sm border-t">
          <div className="container max-w-7xl mx-auto space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground items-center">
              <span>{error}</span>
              <Button variant="ghost" onClick={() => setError(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
