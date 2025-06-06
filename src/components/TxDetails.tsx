"use client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import CopyableValue from "./CopyableValue";
import { useTxDetails } from "@/utils/crypto";
import type { URI, ChainConfig } from "@/types";
import chains from "@/chains.json";
import { decomposeURI } from "@/lib/utils";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { TransactionRow } from "./TransactionRow";

export default function TxDetails({ uri, chain }: { chain: string; uri: URI }) {
  const { chainId, txHash } = decomposeURI(uri);
  const [txDetails, isLoading] = useTxDetails(chain, txHash);
  const [isExpanded, setIsExpanded] = useState(false);

  let chainConfig: ChainConfig | undefined;
  let chainName: string | undefined;
  Object.keys(chains).forEach((key) => {
    if (chains[key as keyof typeof chains].id === chainId) {
      chainConfig = chains[key as keyof typeof chains];
      chainName = key;
      return;
    }
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }
  if (!txDetails) {
    return <div>No tx details...</div>;
  }

  const token = txDetails.token;

  if (!chainId) {
    return <div>No chain id...</div>;
  }
  return (
    <div>
      <TransactionRow tx={txDetails} chain={chain} chainId={chainId} />
      <div className="mt-4">
        <div className="flex flex-row gap-4">
          <div className="space-y-2">
            <div className="text-sm font-semibold">Chain</div>
            <div className="flex flex-row gap-2 h-7 items-center">
              {chainName}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-semibold">Transaction Hash</div>
            <div className="flex flex-row gap-2 h-7 items-center">
              <CopyableValue value={txHash ?? ""} truncate />
              <a
                href={`${chainConfig?.explorer_url}/tx/${txHash}`}
                target="_blank"
                title={`View transaction on ${chainConfig?.explorer_name}`}
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-primary flex items-center p-2 hover:bg-gray-200 rounded-md transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-semibold">Token</div>
            <div className="flex gap-2 h-7 items-center">
              <Link
                href={`/${chain}/token/${token?.address}`}
                title={`View ${token?.symbol} token on TxInfo`}
              >
                <span className="text-base">{token?.name}</span>
              </Link>
              <a
                href={`${chainConfig?.explorer_url}/token/${token.address}`}
                target="_blank"
                title={`View ${token?.symbol} token on ${chainConfig?.explorer_name}`}
                rel="noopener noreferrer"
                className="no-underline"
              >
                <Badge
                  variant="secondary"
                  className="hover:bg-secondary/80 cursor-pointer"
                >
                  {token?.symbol}{" "}
                  <ExternalLink className="h-3 w-3 ml-1 inline" />
                </Badge>
              </a>
            </div>
          </div>
        </div>

        {txDetails.events && txDetails.events.length > 0 && (
          <div className="space-y-3">
            <div
              className="text-sm font-medium cursor-pointer"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              Events
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 ml-2 inline" />
              ) : (
                <ChevronDown className="h-4 w-4 ml-2 inline" />
              )}
            </div>
            {isExpanded && (
              <div className="space-y-3">
                {txDetails.events.map((event, index) => {
                  return (
                    <div
                      key={index}
                      className="p-4 rounded-lg border bg-muted/50"
                    >
                      <div className="flex items-center gap-2 mb-2 cursor-pointer">
                        <div className="flex-1 flex items-center gap-2">
                          <Badge>{event.name}</Badge>
                          Contract address:
                          <CopyableValue
                            value={event.address}
                            truncate
                            className="text-xs text-muted-foreground"
                          />
                        </div>
                      </div>
                      <div className="grid gap-1">
                        {Object.entries(event.args).map(([key, value]) => (
                          <div
                            key={key}
                            className="flex flex-row text-xs sm:text-sm"
                          >
                            <div className="text-muted-foreground truncate mr-2">
                              {key}:
                            </div>
                            <div className="font-mono">{value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
