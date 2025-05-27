"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Download } from "lucide-react";
import { ethers } from "ethers";
import type { BlockchainTransaction, Transaction, URI } from "@/types";
import { useNostr } from "@/providers/NostrProvider";
import { generateURI, getProfileFromNote } from "@/lib/utils";

interface ExportCSVButtonProps {
  transactions: Transaction[];
  chain: string;
  chainId: number;
  onError?: (error: string) => void;
  className?: string;
}

export default function ExportCSVButton({
  transactions,
  chain,
  chainId,
  onError,
  className = "hidden sm:flex items-center gap-2",
}: ExportCSVButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { subscribeToNotesByURI, notesByURI } = useNostr();

  // Create a ref to always access the latest notesByURI
  const notesByURIRef = useRef(notesByURI);

  // Update the ref whenever notesByURI changes
  useEffect(() => {
    notesByURIRef.current = notesByURI;
  }, [notesByURI]);

  const exportToCSV = async () => {
    setIsExporting(true);
    console.log(
      ">>> exportToCSV notesByURI length",
      Object.keys(notesByURIRef.current).length
    );

    try {
      // First, subscribe to all URIs for all filtered transactions
      const allUris = new Set<URI>();

      transactions.forEach((tx) => {
        // Transaction URI for description
        allUris.add(
          generateURI("ethereum", {
            chainId: chainId,
            txHash: tx.txHash,
          })
        );

        // From address URI for profile
        allUris.add(
          generateURI("ethereum", {
            chainId: chainId,
            address: tx.from,
          })
        );

        // To address URI for profile
        allUris.add(
          generateURI("ethereum", {
            chainId: chainId,
            address: tx.to,
          })
        );

        // Token address URI if available
        if (tx.token?.address) {
          allUris.add(
            generateURI("ethereum", {
              chainId: chainId,
              address: tx.token.address,
            })
          );
        }
      });

      const urisArray = Array.from(allUris) as URI[];
      if (urisArray.length > 0) {
        subscribeToNotesByURI(urisArray);
      }

      // Wait and poll for updates - check every 500ms for 5 seconds
      const startTime = Date.now();
      const maxWaitTime = 5000; // 5 seconds
      let lastNoteCount = Object.keys(notesByURIRef.current).length;

      while (Date.now() - startTime < maxWaitTime) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const currentNoteCount = Object.keys(notesByURIRef.current).length;

        // If we haven't received new notes in the last 1 second, we can proceed
        if (currentNoteCount > lastNoteCount) {
          lastNoteCount = currentNoteCount;
        } else if (Date.now() - startTime > 2000) {
          // After 2 seconds, if no new notes are coming, break
          console.log(">>> No new notes received, proceeding with export");
          break;
        }
      }

      const csvHeaders = [
        "Date",
        "Time",
        "Transaction Hash",
        "From Address",
        "From Name",
        "From Avatar",
        "To Address",
        "To Name",
        "To Avatar",
        "Amount",
        "Token Symbol",
        "Token Address",
        "Description",
        "Block Number",
        "Chain",
      ];

      const csvData = transactions.map((tx) => {
        // Get transaction description from notes
        const txURI = generateURI("ethereum", {
          chainId: chainId,
          txHash: tx.txHash,
        });
        const txNote = notesByURIRef.current[txURI]?.[0];
        const description = txNote?.content || "";

        // Get profile data for from address
        const fromURI = generateURI("ethereum", {
          chainId: chainId,
          address: tx.from,
        });
        const fromNote = notesByURIRef.current[fromURI]?.[0];
        const fromProfile = fromNote ? getProfileFromNote(fromNote) : null;

        // Get profile data for to address
        const toURI = generateURI("ethereum", {
          chainId: chainId,
          address: tx.to,
        });
        const toNote = notesByURIRef.current[toURI]?.[0];
        const toProfile = toNote ? getProfileFromNote(toNote) : null;

        const date = new Date(tx.timestamp * 1000);
        const amount = ethers.formatUnits(tx.value, tx.token.decimals);

        // Format date and time in local timezone
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        const seconds = String(date.getSeconds()).padStart(2, "0");

        return [
          `${year}-${month}-${day}`, // YYYY-MM-DD format in local timezone
          `${hours}:${minutes}:${seconds}`, // HH:MM:SS format in local timezone
          tx.txHash,
          tx.from,
          fromProfile?.name || "",
          fromProfile?.picture || "",
          tx.to,
          toProfile?.name || "",
          toProfile?.picture || "",
          amount,
          tx.token.symbol || "",
          tx.token.address,
          description,
          (tx as BlockchainTransaction).blockNumber?.toString() || "", // Cast to handle BlockchainTransaction
          chain,
        ];
      });

      // Create CSV content
      const csvContent = [
        csvHeaders.join(","),
        ...csvData.map((row) =>
          row
            .map((field) =>
              typeof field === "string" &&
              (field.includes(",") ||
                field.includes('"') ||
                field.includes("\n"))
                ? `"${field.replace(/"/g, '""')}"`
                : field
            )
            .join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `transactions_${chain}_${new Date().toISOString().split("T")[0]}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      onError?.("Failed to export CSV. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={exportToCSV}
      variant="outline"
      size="sm"
      className={className}
      disabled={transactions.length === 0 || isExporting}
    >
      {isExporting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading metadata... loaded)
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          Export all {transactions.length} transactions in CSV
        </>
      )}
    </Button>
  );
}
