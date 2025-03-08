import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Coins,
  ListChecks,
  ArrowDownLeft,
  ArrowUpRight,
  Sigma,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ethers } from "ethers";
import { Address } from "@/providers/NostrProvider";
import { truncateAddress } from "@/utils/crypto";
import type { Transaction } from "@/types/index.d.ts";
import { useMemo } from "react";
import type { Token } from "@/types/index.d.ts";

export default function StatsCards({
  transactions,
  accountAddress,
  timeRangeLabel,
  tokens,
}: {
  transactions: Transaction[];
  accountAddress: Address;
  timeRangeLabel: string;
  tokens: Token[];
}) {
  const stats = useMemo(() => {
    const received = transactions
      .filter((tx) => tx.to.toLowerCase() === accountAddress.toLowerCase())
      .reduce(
        (acc, tx) =>
          acc + Number(ethers.formatUnits(tx.value, tx.token.decimals)),
        0
      );

    const spent = transactions
      .filter((tx) => tx.from.toLowerCase() === accountAddress.toLowerCase())
      .reduce(
        (acc, tx) =>
          acc + Number(ethers.formatUnits(tx.value, tx.token.decimals)),
        0
      );

    return {
      count: transactions.length,
      received: received,
      spent: spent,
      net: received - spent,
    };
  }, [transactions, accountAddress]);

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Transactions</CardTitle>
          <ListChecks className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {Intl.NumberFormat().format(stats.count)}
          </div>
          <p className="text-xs text-muted-foreground">
            in {timeRangeLabel.toLowerCase()}
          </p>
        </CardContent>
      </Card>

      {tokens.length === 1 ? (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Received</CardTitle>
              <ArrowDownLeft className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Intl.NumberFormat().format(stats.received)}
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  {tokens[0].symbol}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                in {timeRangeLabel.toLowerCase()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Spent</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Intl.NumberFormat().format(stats.spent)}
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  {tokens[0].symbol}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                in {timeRangeLabel.toLowerCase()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Change</CardTitle>
              <Sigma
                className={cn(
                  "h-4 w-4",
                  stats.net > 0
                    ? "text-green-500"
                    : stats.net < 0
                    ? "text-red-500"
                    : "text-muted-foreground"
                )}
              />
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  "text-2xl font-bold",
                  stats.net > 0
                    ? "text-green-500"
                    : stats.net < 0
                    ? "text-red-500"
                    : "text-foreground"
                )}
              >
                {stats.net > 0 ? "+" : ""}
                {Intl.NumberFormat().format(stats.net)}
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  {tokens[0].symbol}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                in {timeRangeLabel.toLowerCase()}
              </p>
            </CardContent>
          </Card>
        </>
      ) : (
        // Group transactions by token and show stats for each
        Object.entries(
          transactions.reduce((acc, tx) => {
            const tokenKey = `${tx.token.symbol} (${truncateAddress(
              tx.token.address
            )})`;
            if (!acc[tokenKey]) {
              acc[tokenKey] = { received: 0, spent: 0, net: 0 };
            }
            const amount = Number(
              ethers.formatUnits(tx.value, tx.token.decimals)
            );
            if (tx.to.toLowerCase() === accountAddress.toLowerCase()) {
              acc[tokenKey].received += amount;
              acc[tokenKey].net += amount;
            } else {
              acc[tokenKey].spent += amount;
              acc[tokenKey].net -= amount;
            }
            return acc;
          }, {} as Record<string, { received: number; spent: number; net: number }>)
        ).map(([token, stats]) => (
          <Card key={token} className="col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4">
              <CardTitle className="text-sm font-medium">{token}</CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-center mb-4">
                <p
                  className={cn(
                    "text-2xl font-bold",
                    stats.net > 0
                      ? "text-green-500"
                      : stats.net < 0
                      ? "text-red-500"
                      : "text-foreground"
                  )}
                >
                  {stats.net > 0 ? "+" : ""}
                  {Intl.NumberFormat().format(stats.net).replace("-0", "0")}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center border-t pt-3">
                <p className="text-sm font-medium text-green-500">
                  +{Intl.NumberFormat().format(stats.received)}
                </p>
                <p className="text-sm font-medium text-red-500">
                  -{Intl.NumberFormat().format(stats.spent)}
                </p>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
