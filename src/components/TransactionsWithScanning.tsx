"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { JsonRpcProvider } from "ethers";
import { processBlockRange, getBlockRangeForAddress } from "../utils/crypto";
import chains from "../chains.json";
import { Button } from "@/components/ui/button";
import React from "react";
import { TransactionRow } from "@/components/TransactionRow";
import { format, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { X } from "lucide-react";
import type { Address, Token, URI, Transaction, Chain, ChainConfig } from "@/types";
import { cn, generateURI } from "@/lib/utils";
import { useNostr } from "@/providers/NostrProvider";
import StatsCards from "./StatsCards";
import Filters, { type Filter } from "./Filters";
import { createProvider, TxBatchProvider } from "@/utils/rpcProvider";

interface Props {
  address: Address;
  chain: Chain;
}

const LIMIT_PER_PAGE = 50;

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
    type: "all",
    dateRange: {
      start: startOfMonth(new Date()),
      end: endOfMonth(new Date()),
      label: format(new Date(), "MMMM yyyy"),
    },
    selectedTokens: [],
  });

  const [isScanning, setIsScanning] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const chainConfig = chains[chain as keyof typeof chains] as ChainConfig;
  const rpc = useMemo(
    () =>
      typeof chainConfig.rpc === "string" ? [chainConfig.rpc] : chainConfig.rpc,
    [chainConfig]
  );
  const provider = useRef<TxBatchProvider>(createProvider({
    rpcUrl: rpc[0],
    type: chainConfig.type
  }));
  const allTransactions = useRef<Transaction[]>([]);
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
        if (
          tx.token?.address &&
          tx.token?.symbol &&
          tx.token?.symbol?.length > 0 &&
          tx.token?.symbol?.length <= 6
        ) {
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

  const totalIterations = useRef(0);

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

    const fetchAllTransactions = async () => {
      setIsScanning(true);
      try {
        const blockRange = await getBlockRangeForAddress(chain, address);

        const lastBlock =
          blockRange?.lastBlock || (await provider.current.getBlockNumber());
        let fromBlock = lastBlock - (lastBlock % limit);
        let toBlock = lastBlock;
        const firstBlock = blockRange?.firstBlock || 1;
        console.log(">>> total block range", firstBlock, lastBlock);
        console.log(">>> current block range", fromBlock, toBlock);
        const iterationsRequired = Math.ceil((lastBlock - firstBlock) / limit);
        console.log(">>> iterations required", iterationsRequired);
        setProgress({
          fromBlock,
          toBlock,
          lastBlock,
          firstBlock,
        });
        while (
          toBlock > 0 &&
          fromBlock >= firstBlock - limit &&
          totalIterations.current <= iterationsRequired
        ) {
          totalIterations.current++;
          // console.log(
          //   ">>> totalIterations.current",
          //   totalIterations.current,
          //   fromBlock,
          //   toBlock
          // );
          try {
            const newTxs: Transaction[] = await provider.current.processBlockRange(
              chain,
              address,
              fromBlock,
              toBlock,
            );
            // Update progress
            setProgress({
              fromBlock,
              toBlock,
              lastBlock,
              firstBlock,
            });

            allTransactions.current.push(...newTxs);

            if (newTxs && newTxs.length > 0) {
              // This triggers a re-render of the component which we don't want
              // Update state with all transactions so far
              // setTransactions((prevTxs) => {
              //   // const uniques = newTxs.filter((tx: Transaction) => {
              //   //   const isDuplicate = prevTxs.some(
              //   //     (t) => t.txHash === tx.txHash
              //   //   );
              //   //   // if (isDuplicate) {
              //   //   //   console.log("!!! duplicate", tx);
              //   //   // }
              //   //   return !isDuplicate;
              //   // });
              //   // return [...prevTxs, ...uniques];
              //   return [...prevTxs, ...newTxs];
              // });
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

        setTransactions((prevTxs) => {
          const uniques = allTransactions.current.filter((tx: Transaction) => {
            const isDuplicate = prevTxs.some((t) => t.txHash === tx.txHash);
            // if (isDuplicate) {
            //   console.log("!!! duplicate", tx);
            // }
            return !isDuplicate;
          });

          allTransactions.current = uniques;
          return uniques;
        });
        // Store in localStorage
        setItem(
          `${String(chain)}:${address}:transactions`,
          JSON.stringify(allTransactions.current)
        );
      } catch (error) {
        console.error("Error fetching transactions:", error);
        setError("Unable to load transactions. Please try again later.");
      } finally {
        setIsScanning(false);
      }
    };

    fetchAllTransactions();
  }, [chain, address, provider, errorCount, rpc]);

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

  // Calculate transaction statistics based on filtered transactions

  // Calculate progress percentage
  const progressPercentage = useMemo(() => {
    if (!progress.firstBlock || !progress.lastBlock) return 0;
    const totalBlocks = progress.lastBlock - progress.firstBlock;
    const scannedBlocks = progress.lastBlock - progress.fromBlock;
    return Math.min(Math.round((scannedBlocks / totalBlocks) * 100), 100);
  }, [progress]);

  // const getItem = (key: string) => {
  //   if (typeof window === "undefined") return [];
  //   return JSON.parse(localStorage.getItem(key) || "[]");
  // };

  const setItem = (key: string, data: string) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, data);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Filters
        availableTokens={availableTokens}
        transactions={filteredTransactions}
        accountAddress={address as Address}
        onChange={setTransactionsFilter}
      />

      {/* Stats Cards */}
      <StatsCards
        accountAddress={address as Address}
        transactions={filteredTransactions}
        tokens={
          transactionsFilter.selectedTokens.length > 0
            ? transactionsFilter.selectedTokens
            : availableTokens
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
          />
        );
      })}

      {/* Progress Bar */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-sm border-t",
          "transition-opacity duration-200",
          isScanning ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
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
