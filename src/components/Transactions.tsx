"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { getTransactionsFromEtherscan } from "../utils/crypto";
import chains from "../chains.json";
import { Button } from "@/components/ui/button";
import React from "react";
import { TransactionRow } from "@/components/TransactionRow";
import { isWithinInterval } from "date-fns";
import { Loader2, X } from "lucide-react";
import type {
  Address,
  TokenStats,
  URI,
  Transaction,
  BlockchainTransaction,
} from "@/types";
import { useNostr } from "@/providers/NostrProvider";
import StatsCards from "./StatsCards";
import Filters, { type Filter } from "./Filters";
import { useLiveTransactions } from "@/hooks/useLiveTransactions";
import { formatTimestamp, generateURI, getProfileFromNote } from "@/lib/utils";
import { ethers } from "ethers";
import Pagination from "./Pagination";
import ExportCSVButton from "./ExportCSVButton";

interface Props {
  chain: string;
  tokenAddress?: Address;
  accountAddress?: Address;
}

const LIMIT_PER_PAGE = 20;

function applyTxFilter(
  tx: Transaction,
  transactionsFilter: Filter,
  accountAddress: Address | undefined
): boolean {
  // Apply date filter
  if (transactionsFilter.dateRange.start && transactionsFilter.dateRange.end) {
    const txDate = new Date(tx.timestamp * 1000);
    if (
      !isWithinInterval(txDate, {
        start: transactionsFilter.dateRange.start!,
        end: transactionsFilter.dateRange.end!,
      })
    ) {
      return false;
    }
  }

  // Apply token filter
  if (transactionsFilter.selectedTokens.length > 0) {
    if (
      !tx.token?.address ||
      !transactionsFilter.selectedTokens
        .map((t) => t.address)
        .includes(tx.token?.address)
    ) {
      return false;
    }
  }

  if (accountAddress && transactionsFilter.type === "in") {
    return tx.to === accountAddress.toLowerCase();
  } else if (accountAddress && transactionsFilter.type === "out") {
    return tx.from === accountAddress.toLowerCase();
  }

  return true;
}

export default function Transactions({
  chain,
  tokenAddress,
  accountAddress,
}: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [txsPerPage, setTxsPerPage] = useState(LIMIT_PER_PAGE);
  const [transactions, setTransactions] = useState<BlockchainTransaction[]>([]);
  const { subscribeToNotesByURI, notesByURI } = useNostr();
  const [showIgnored, setShowIgnored] = useState(false);
  const [transactionsFilter, setTransactionsFilter] = useState<Filter>({
    dateRange: {
      start: null,
      end: null,
      label: "All Time",
    },
    type: "all",
    selectedTokens: [],
  });
  const {
    transactions: newTransactions,
    skippedTransactions,
    start,
  } = useLiveTransactions({
    chain,
    tokenAddress,
    accountAddress,
    maxTransactionsPerMinute: 45,
  });
  const [error, setError] = useState<string | null>(null);

  // Create a ref to always access the latest notesByURI
  const notesByURIRef = useRef(notesByURI);

  // Update the ref whenever notesByURI changes
  useEffect(() => {
    notesByURIRef.current = notesByURI;
  }, [notesByURI]);

  const chainConfig = chains[chain as keyof typeof chains];
  const referenceAccount = accountAddress
    ? accountAddress
    : "0x0000000000000000000000000000000000000000";

  // Get unique token symbols from transactions
  const availableTokens = useMemo(() => {
    if (!transactions || !Array.isArray(transactions)) {
      console.log("No transactions or invalid format:", transactions);
      return [];
    }

    try {
      const tokenMap: Record<Address, TokenStats> = {};
      transactions.forEach((tx) => {
        if (
          tx.token?.address &&
          tx.token?.symbol &&
          tx.token?.symbol?.length > 0 &&
          tx.token?.symbol?.length <= 6
        ) {
          const tokenStats = tokenMap[
            tx.token.address.toLowerCase() as Address
          ] || {
            token: tx.token,
            txCount: 0,
            inbound: {
              count: 0,
              value: 0,
            },
            outbound: {
              count: 0,
              value: 0,
            },
            totalVolume: 0,
            netValue: 0,
          };
          tokenStats.txCount++;
          const value = Number(ethers.formatUnits(tx.value, tx.token.decimals));
          if (tx.from === referenceAccount.toLowerCase()) {
            tokenStats.outbound.count++;
            tokenStats.outbound.value += value;
            tokenStats.netValue -= value;
          } else if (tx.to === referenceAccount.toLowerCase()) {
            tokenStats.inbound.count++;
            tokenStats.inbound.value += value;
            tokenStats.netValue += value;
          }
          tokenStats.totalVolume =
            tokenStats.inbound.value + tokenStats.outbound.value;
          tokenMap[tx.token.address.toLowerCase() as Address] = tokenStats;
        }
      });
      return Object.values(tokenMap)
        .filter(
          (tokenStats) =>
            tokenStats.outbound.count > 0 || tokenStats.inbound.count > 1
        )
        .map((tokenStats) => tokenStats.token);
    } catch (error) {
      console.error("Error processing tokens:", error);
      return [];
    }
  }, [transactions, referenceAccount]);

  // Helper function to check if a transaction is marked as ignored
  const isTransactionIgnored = useMemo(
    () =>
      (tx: Transaction): boolean => {
        const uri = generateURI("ethereum", {
          chainId: chainConfig.id,
          txHash: tx.txHash,
        });
        const notes = notesByURI[uri];
        if (!notes || notes.length === 0) return false;

        // Check if the latest note has a "t" tag with value "ignore"
        const latestNote = notes[0];
        return latestNote.tags.some(
          (tag) => tag[0] === "t" && tag[1] === "ignore"
        );
      },
    [chainConfig.id, notesByURI]
  );

  // Filter transactions based on date, tokens, and ignore status
  const filteredTransactions = useMemo(() => {
    if (transactions.length === 0) return [];

    return transactions.filter((tx) => {
      // Apply existing filters
      if (!applyTxFilter(tx, transactionsFilter, accountAddress)) {
        return false;
      }

      // Apply ignore filter if showIgnored is false
      if (!showIgnored && isTransactionIgnored(tx)) {
        return false;
      }

      return true;
    });
  }, [
    transactions,
    transactionsFilter,
    accountAddress,
    showIgnored,
    isTransactionIgnored,
  ]);

  // Count ignored transactions
  const ignoredCount = useMemo(() => {
    return transactions.filter((tx) => {
      // Only count transactions that pass other filters
      return (
        applyTxFilter(tx, transactionsFilter, accountAddress) &&
        isTransactionIgnored(tx)
      );
    }).length;
  }, [transactions, transactionsFilter, accountAddress, isTransactionIgnored]);

  const currentPageTxs = useMemo(
    () =>
      filteredTransactions.slice(
        (currentPage - 1) * txsPerPage,
        currentPage * txsPerPage
      ),
    [filteredTransactions, currentPage, txsPerPage]
  );

  useEffect(() => {
    // const cachedTransactions = getItem(
    //   `${chain}:${address}:transactions`
    // );
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

    const fetchPastTransactions = async () => {
      try {
        const transactions: BlockchainTransaction[] | null =
          await getTransactionsFromEtherscan(
            chain,
            accountAddress,
            tokenAddress
          );
        if (transactions) {
          setTransactions(transactions);
        }
        const fromBlock = transactions?.[0]?.blockNumber ?? 0;
        if (fromBlock > 0) {
          start({ fromBlock: fromBlock + 1, websocket: false });
        }
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching transactions:", error);
        setError("Unable to load transactions. Please try again later.");
      }
    };

    fetchPastTransactions();
  }, [accountAddress, chain, tokenAddress, start]);

  useEffect(() => {
    setTransactions((prev) => [...newTransactions, ...prev]);
  }, [newTransactions]);

  // Subscribe to notes for all displayed transactions
  useEffect(() => {
    const uris = new Set<URI>();
    currentPageTxs.slice(0, LIMIT_PER_PAGE).forEach((tx: Transaction) => {
      if (tx.token?.address) {
        uris.add(
          generateURI("ethereum", {
            chainId: chainConfig.id,
            address: tx.token?.address,
          })
        );
      }
      uris.add(
        generateURI("ethereum", { chainId: chainConfig.id, address: tx.from })
      );
      uris.add(
        generateURI("ethereum", { chainId: chainConfig.id, address: tx.to })
      );
      uris.add(
        generateURI("ethereum", { chainId: chainConfig.id, txHash: tx.txHash })
      );
    });
    const urisArray = Array.from(uris) as URI[];
    if (urisArray.length > 0) {
      subscribeToNotesByURI(urisArray);
    }
  }, [currentPageTxs, chainConfig, subscribeToNotesByURI]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full py-24">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  const totalPages = Math.ceil(filteredTransactions.length / txsPerPage);
  const selectedTokens =
    transactionsFilter.selectedTokens.length > 0
      ? transactionsFilter.selectedTokens
      : availableTokens.length === 1
      ? availableTokens
      : [];
  return (
    <div className="space-y-6">
      {/* Filters */}
      <Filters
        availableTokens={availableTokens}
        transactions={transactions}
        accountAddress={accountAddress as Address}
        onChange={setTransactionsFilter}
      />

      {/* Stats Cards */}
      {selectedTokens.length > 0 && (
        <StatsCards
          accountAddress={accountAddress as Address}
          transactions={filteredTransactions}
          tokens={selectedTokens}
          timeRangeLabel={transactionsFilter.dateRange.label}
        />
      )}

      {skippedTransactions > 0 && (
        <div className="text-sm text-muted-foreground">
          {skippedTransactions} new transactions since{" "}
          {formatTimestamp((transactions[0] as Transaction)?.timestamp)}{" "}
          (refresh to load)
        </div>
      )}

      {/* Ignored Transactions Toggle */}
      {ignoredCount > 0 && (
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <span>
            {ignoredCount} transaction{ignoredCount !== 1 ? "s" : ""} ignored
          </span>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-sm"
            onClick={() => setShowIgnored(!showIgnored)}
          >
            {showIgnored ? "Hide ignored" : "Show all"}
          </Button>
        </div>
      )}

      {/* Transactions List */}
      {currentPageTxs.map((tx, idx) => {
        return (
          <TransactionRow
            key={`${tx.txHash}-${idx}`}
            tx={tx}
            chain={chain}
            chainId={chainConfig.id}
          />
        );
      })}

      {/* pagination */}
      <div className="flex items-center justify-between">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          txsPerPage={txsPerPage}
          onPageChange={setCurrentPage}
          onTxsPerPageChange={setTxsPerPage}
        />

        <ExportCSVButton
          transactions={filteredTransactions}
          chain={chain}
          chainId={chainConfig.id}
          onError={setError}
        />
      </div>

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
