"use client";

import chains from "@/chains.json";
import Avatar from "@/components/Avatar";
import { formatNumber, generateURI, getProfileFromNote } from "@/lib/utils";
import { useNostr } from "@/providers/NostrProvider";
import type { Address, Chain, ChainConfig, Token, Transaction } from "@/types";
import { truncateAddress } from "@/utils/crypto";
import { ethers } from "ethers";
import dynamic from "next/dynamic";
import { useCallback, useMemo } from "react";

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface FlowChartProps {
  transactions: Transaction[];
  accountAddress: Address;
  chain: Chain;
  tokens: Array<Token>;
  viewMode: "sankey" | "list";
}

interface AddressNode {
  address: Address;
  label: string;
  amount: number;
}

export default function FlowChart({
  transactions,
  accountAddress,
  chain,
  tokens,
  viewMode,
}: FlowChartProps) {
  const { notesByURI, subscribeToNotesByURI } = useNostr();
  const chainConfig = chains[chain];
  const chainId = chainConfig.id;
  // Helper function to check if a transaction is marked as ignored
  const isTransactionIgnored = useCallback(
    (tx: Transaction): boolean => {
      const uri = generateURI(chainConfig.namespace, {
        chainId,
        txId: tx.txId,
      });
      const notes = notesByURI[uri];
      if (!notes || notes.length === 0) return false;

      // Check if the latest note has a "t" tag with value "ignore"
      const latestNote = notes[0];
      return latestNote.tags.some(
        (tag) => tag[0] === "t" && tag[1] === "ignore"
      );
    },
    [chainConfig.namespace, chainId, notesByURI]
  );

  const sankeyData = useMemo(() => {
    // Filter out ignored transactions
    const filteredTransactions = transactions.filter(
      (tx) => !isTransactionIgnored(tx)
    );

    const sources: Record<Address, AddressNode> = {};
    const destinations: Record<Address, AddressNode> = {};

    // Aggregate transactions by source and destination
    filteredTransactions.forEach((tx) => {
      const amount = Number(ethers.formatUnits(tx.value, tx.token.decimals));

      if (tx.to.toLowerCase() === accountAddress.toLowerCase()) {
        // Money coming in from tx.from
        const from = tx.from.toLowerCase() as Address;
        const uri = generateURI(chainConfig.namespace, {
          chainId,
          address: from,
        });
        subscribeToNotesByURI([uri]);
        const notes = notesByURI[uri];
        const profile = notes?.[0] ? getProfileFromNote(notes[0]) : null;
        const label = profile?.name || truncateAddress(from);

        if (!sources[from]) {
          sources[from] = { address: from, label, amount: 0 };
        }
        sources[from].amount += amount;
      } else if (tx.from.toLowerCase() === accountAddress.toLowerCase()) {
        // Money going out to tx.to
        const to = tx.to.toLowerCase() as Address;
        const uri = generateURI(chainConfig.namespace, {
          chainId,
          address: to,
        });
        subscribeToNotesByURI([uri]);
        const notes = notesByURI[uri];
        const profile = notes?.[0] ? getProfileFromNote(notes[0]) : null;
        const label = profile?.name || truncateAddress(to);

        if (!destinations[to]) {
          destinations[to] = { address: to, label, amount: 0 };
        }
        destinations[to].amount += amount;
      }
    });

    // Get top 15 sources and destinations
    const topSources = Object.values(sources)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 15);

    const topDestinations = Object.values(destinations)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 15);

    // Build Sankey nodes and links
    const nodes: string[] = [];
    const nodeColors: string[] = [];
    const sourceIndices: number[] = [];
    const targetIndices: number[] = [];
    const values: number[] = [];
    const linkColors: string[] = [];

    // Add source nodes (green)
    topSources.forEach((source) => {
      nodes.push(source.label);
      nodeColors.push("rgba(34, 197, 94, 0.8)"); // green-500
    });

    // Add account node (blue)
    const accountUri = generateURI(chainConfig.namespace, {
      chainId,
      address: accountAddress,
    });
    subscribeToNotesByURI([accountUri]);
    const accountNotes = notesByURI[accountUri];
    const accountProfile = accountNotes?.[0]
      ? getProfileFromNote(accountNotes[0])
      : null;
    const accountLabel =
      accountProfile?.name || truncateAddress(accountAddress);
    const accountIndex = nodes.length;
    nodes.push(accountLabel);
    nodeColors.push("rgba(59, 130, 246, 0.8)"); // blue-500

    // Add destination nodes (red)
    const destinationStartIndex = nodes.length;
    topDestinations.forEach((dest) => {
      nodes.push(dest.label);
      nodeColors.push("rgba(239, 68, 68, 0.8)"); // red-500
    });

    // Create links from sources to account
    topSources.forEach((source, idx) => {
      sourceIndices.push(idx);
      targetIndices.push(accountIndex);
      values.push(source.amount);
      linkColors.push("rgba(34, 197, 94, 0.4)"); // green with transparency
    });

    // Create links from account to destinations
    topDestinations.forEach((dest, idx) => {
      sourceIndices.push(accountIndex);
      targetIndices.push(destinationStartIndex + idx);
      values.push(dest.amount);
      linkColors.push("rgba(239, 68, 68, 0.4)"); // red with transparency
    });

    // Prepare data for list view with profiles
    const sourcesWithProfiles = topSources.map((source) => {
      const uri = generateURI(chainConfig.namespace, {
        chainId,
        address: source.address,
      });
      const notes = notesByURI[uri];
      const profile = notes?.[0] ? getProfileFromNote(notes[0]) : null;
      return {
        ...source,
        profile: profile || {
          uri,
          address: source.address,
          name: "",
        },
      };
    });

    const destinationsWithProfiles = topDestinations.map((dest) => {
      const uri = generateURI(chainConfig.namespace, {
        chainId,
        address: dest.address,
      });
      const notes = notesByURI[uri];
      const profile = notes?.[0] ? getProfileFromNote(notes[0]) : null;
      return {
        ...dest,
        profile: profile || {
          uri,
          address: dest.address,
          name: "",
        },
      };
    });

    const totalInbound = topSources.reduce((sum, s) => sum + s.amount, 0);
    const totalOutbound = topDestinations.reduce((sum, d) => sum + d.amount, 0);

    return {
      nodes,
      nodeColors,
      sourceIndices,
      targetIndices,
      values,
      linkColors,
      sources: sourcesWithProfiles,
      destinations: destinationsWithProfiles,
      totalInbound,
      totalOutbound,
    };
  }, [
    transactions,
    chainConfig.namespace,
    chainId,
    accountAddress,
    subscribeToNotesByURI,
    notesByURI,
    isTransactionIgnored,
  ]);

  const tokenSymbol = tokens.length === 1 ? tokens[0].symbol : "tokens";

  if (sankeyData.nodes.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No transaction flow data available
      </div>
    );
  }

  const getDisplayName = (node: { label: string; address: Address }) => {
    return node.label || truncateAddress(node.address);
  };

  return (
    <div className="w-full">
      {/* Sankey Diagram View */}
      {viewMode === "sankey" && (
        <div className="w-full" style={{ height: "500px" }}>
          <Plot
            data={[
              {
                type: "sankey",
                orientation: "h",
                node: {
                  pad: 15,
                  thickness: 20,
                  line: {
                    color: "white",
                    width: 0.5,
                  },
                  label: sankeyData.nodes,
                  color: sankeyData.nodeColors,
                },
                link: {
                  source: sankeyData.sourceIndices,
                  target: sankeyData.targetIndices,
                  value: sankeyData.values,
                  color: sankeyData.linkColors,
                },
              },
            ]}
            layout={{
              title: {
                text: `Money Flow (${tokenSymbol})`,
                font: { size: 14, color: "#6b7280" },
              },
              font: {
                size: 12,
                color: "#374151",
              },
              paper_bgcolor: "transparent",
              plot_bgcolor: "transparent",
              height: 500,
              margin: { l: 20, r: 20, t: 40, b: 20 },
            }}
            config={{
              displayModeBar: false,
              responsive: true,
            }}
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="flex items-start justify-between gap-8">
          {/* Sources (Left) */}
          <div className="flex-1 space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">
              Top Sources ({sankeyData.sources.length})
            </h3>
            {sankeyData.sources.map((source) => {
              const percentage =
                sankeyData.totalInbound > 0
                  ? (source.amount / sankeyData.totalInbound) * 100
                  : 0;

              return (
                <div
                  key={source.address}
                  className="flex items-center gap-3 group"
                >
                  <Avatar
                    profile={source.profile}
                    editable={false}
                    className="h-8 w-8 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-medium truncate">
                        {getDisplayName(source)}
                      </span>
                      <span className="text-sm font-semibold text-green-600 whitespace-nowrap">
                        +{formatNumber(source.amount)} {tokenSymbol}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Center Account */}
          <div className="flex flex-col items-center justify-center px-8 flex-shrink-0">
            <div className="relative">
              <Avatar
                profile={{
                  uri: generateURI(chainConfig.namespace, {
                    chainId,
                    address: accountAddress,
                  }),
                  address: accountAddress,
                  name: "",
                }}
                editable={false}
                className="h-16 w-16 ring-4 ring-primary/20"
              />
            </div>
            <div className="mt-2 text-center">
              <p className="text-xs text-muted-foreground">
                {truncateAddress(accountAddress)}
              </p>
            </div>
          </div>

          {/* Destinations (Right) */}
          <div className="flex-1 space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">
              Top Destinations ({sankeyData.destinations.length})
            </h3>
            {sankeyData.destinations.map((dest) => {
              const percentage =
                sankeyData.totalOutbound > 0
                  ? (dest.amount / sankeyData.totalOutbound) * 100
                  : 0;

              return (
                <div
                  key={dest.address}
                  className="flex items-center gap-3 group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-semibold text-red-600 whitespace-nowrap">
                        -{formatNumber(dest.amount)} {tokenSymbol}
                      </span>
                      <span className="text-sm font-medium truncate">
                        {getDisplayName(dest)}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 transition-all ml-auto"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <Avatar
                    profile={dest.profile}
                    editable={false}
                    className="h-8 w-8 flex-shrink-0"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
