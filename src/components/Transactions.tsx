"use client";

import { useMemo, useState, useEffect } from "react";
import { getTransactionsFromEtherscan } from "../utils/crypto";
import chains from "../chains.json";
import { Button } from "@/components/ui/button";
import React from "react";
import { TransactionRow } from "@/components/TransactionRow";
import { isWithinInterval } from "date-fns";
import { Loader2, X } from "lucide-react";
import type { Address, TokenStats, URI, Transaction } from "@/types";
import { useNostr } from "@/providers/NostrProvider";
import StatsCards from "./StatsCards";
import Filters, { type Filter } from "./Filters";
import { useLiveTransactions } from "@/hooks/useLiveTransactions";
import { formatTimestamp, generateURI } from "@/lib/utils";
import { ethers } from "ethers";
interface Props {
  chain: string;
  tokenAddress?: Address;
  accountAddress?: Address;
}

const LIMIT_PER_PAGE = 50;

export default function Transactions({
  chain,
  tokenAddress,
  accountAddress,
}: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [transactionsFilter, setTransactionsFilter] = useState<Filter>({
    dateRange: {
      start: null,
      end: null,
      label: "All Time",
    },
    type: "all",
    selectedTokens: [],
  });
  const { transactions: newTransactions, skippedTransactions } =
    useLiveTransactions({
      chain,
      tokenAddress,
      accountAddress,
      maxTransactionsPerMinute: 3,
    });
  const [error, setError] = useState<string | null>(null);

  const chainConfig = chains[chain as keyof typeof chains];

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
          if (tx.from === accountAddress?.toLowerCase()) {
            tokenStats.outbound.count++;
            tokenStats.outbound.value += value;
            tokenStats.netValue -= value;
          } else if (tx.to === accountAddress?.toLowerCase()) {
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
  }, [transactions, accountAddress]);

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

    if (accountAddress && transactionsFilter.type === "in") {
      filtered = filtered.filter(
        (tx) => tx.to === accountAddress.toLowerCase()
      );
    } else if (accountAddress && transactionsFilter.type === "out") {
      filtered = filtered.filter(
        (tx) => tx.from === accountAddress.toLowerCase()
      );
    }

    return filtered.slice(0, 100);
  }, [transactions, transactionsFilter, accountAddress]);

  useMemo(() => {
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
        const transactions: Transaction[] | null =
          await getTransactionsFromEtherscan(
            chain,
            accountAddress,
            tokenAddress
          );
        if (transactions) {
          setTransactions(transactions.slice(0, 500));
        }
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching transactions:", error);
        setError("Unable to load transactions. Please try again later.");
      }
    };

    fetchPastTransactions();
  }, [accountAddress, chain, tokenAddress]);

  useEffect(() => {
    setTransactions((prev) => [...newTransactions, ...prev]);
  }, [newTransactions]);

  // Subscribe to notes for all transactions at once
  const { subscribeToNotesByURI } = useNostr();

  // Initial load
  useEffect(() => {
    const uris = new Set<URI>();
    filteredTransactions.slice(0, LIMIT_PER_PAGE).forEach((tx: Transaction) => {
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

    subscribeToNotesByURI(Array.from(uris) as URI[]);
  }, [filteredTransactions, chainConfig, subscribeToNotesByURI]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full py-24">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

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
      <StatsCards
        accountAddress={accountAddress as Address}
        transactions={filteredTransactions}
        tokens={
          transactionsFilter.selectedTokens.length > 0
            ? transactionsFilter.selectedTokens
            : availableTokens
        }
        timeRangeLabel={transactionsFilter.dateRange.label}
      />

      {skippedTransactions > 0 && (
        <div className="text-sm text-muted-foreground">
          {skippedTransactions} new transactions since{" "}
          {formatTimestamp((transactions[0] as Transaction).timestamp)} (refresh
          to load)
        </div>
      )}

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
