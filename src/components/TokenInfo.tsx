"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import chains from "../chains.json";
import { ExternalLink } from "lucide-react";
import CopyableValue from "./CopyableValue";
import { useTokenDetails } from "@/utils/crypto";
import { JsonRpcProvider } from "ethers";
export default function TokenDetails({
  chain,
  address,
}: {
  chain: string;
  address: string;
}) {
  const chainConfig = chains[chain as keyof typeof chains];

  const [token, isLoading, error] = useTokenDetails(chain, address);

  if (!chainConfig) {
    return <div>Chain not found</div>;
  }
  console.log("TokenDetails", token);

  if (!token || isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{token.name}</span>
          <a
            href={`${chainConfig?.explorer_url}/token/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
          >
            View on {chainConfig?.explorer_name}{" "}
            <ExternalLink className="h-4 w-4" />
          </a>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6"></CardContent>
    </Card>
  );
}
