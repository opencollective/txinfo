"use client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import chains from "../chains.json";
import { ExternalLink } from "lucide-react";
import CopyableValue from "./CopyableValue";
import { useTxDetails } from "@/utils/crypto";
import { ethers } from "ethers";
import { URI } from "@/providers/NostrProvider";

type TokenDetails = {
  name: string;
  symbol: string;
  decimals: number;
  address: string;
};

type TxDetails = {
  hash: string;
  name: string;
  args: any[];
  chainId: string;
  events?: Array<{
    name: string;
    args: Record<string, string>;
    address: string;
  }>;
};

export default function TxDetails({
  uri,
  provider,
}: {
  uri: URI;
  provider: ethers.JsonRpcProvider;
}) {
  const [txDetails, isLoading] = useTxDetails(chain, tx_hash);

  console.log("txDetails", txDetails);

  if (isLoading) {
    return <div>Loading...</div>;
  }
  if (!txDetails) {
    return <div>No tx details...</div>;
  }

  const token = txDetails.token;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Transaction Details</span>
          <a
            href={`${chain?.explorer_url}/tx/${txDetails.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
          >
            View on {chain?.explorer_name} <ExternalLink className="h-4 w-4" />
          </a>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="text-sm font-medium">Transaction Hash</div>
          <CopyableValue value={txDetails.hash} />
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Token</div>
          <div className="flex items-center gap-2">
            <span className="text-lg">{token?.name}</span>
            <a
              href={`${chain?.explorer_url}/token/${token.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="no-underline"
            >
              <Badge
                variant="secondary"
                className="hover:bg-secondary/80 cursor-pointer"
              >
                {token?.symbol} <ExternalLink className="h-3 w-3 ml-1 inline" />
              </Badge>
            </a>
          </div>
        </div>

        {txDetails.events && txDetails.events.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm font-medium">Events</div>
            <div className="space-y-3">
              {txDetails.events.map((event, index) => (
                <div key={index} className="p-4 rounded-lg border bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge>{event.name}</Badge>
                    <CopyableValue
                      value={event.address}
                      truncate
                      className="text-xs text-muted-foreground"
                    />
                  </div>
                  <div className="grid gap-1">
                    {Object.entries(event.args).map(([key, value]) => (
                      <div key={key} className="flex flex-row">
                        <div className="text-muted-foreground truncate mr-2">
                          {key}:
                        </div>
                        <div className="font-mono">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
