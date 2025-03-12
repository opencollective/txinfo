import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, ArrowLeftRight, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Check, X, Coins } from "lucide-react";
import type { Address, Token, Transaction } from "@/types/index.d.ts";
import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, startOfToday } from "date-fns";
import { truncateAddress } from "@/utils/crypto";

type DateRange = {
  start: Date | null;
  end: Date | null;
  label: string;
};

export type Filter = {
  dateRange: DateRange;
  selectedTokens: Token[];
  type: "in" | "out" | "all";
};

export default function Filters({
  availableTokens,
  transactions,
  onChange,
  accountAddress,
}: {
  availableTokens: Token[];
  transactions: Transaction[];
  accountAddress: Address;
  onChange: (filter: Filter) => void;
}) {
  const [dateRange, setDateRange] = useState<DateRange>({
    start: null,
    end: null,
    label: "All Time",
  });
  const [selectedTokens, setSelectedTokens] = useState<Token[]>([]);
  const [tokenSelectOpen, setTokenSelectOpen] = useState(false);
  const [type, setType] = useState<"in" | "out" | "all">("all");

  // Generate list of last 12 months
  const monthOptions = useMemo(() => {
    const options = [];
    const today = new Date();

    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      options.push({
        start: startOfMonth(date),
        end: endOfMonth(date),
        label: format(date, "MMMM yyyy"),
      });
    }
    return options;
  }, []);

  type TransactionStats = {
    byMonth: Record<string, { all: number; in: number; out: number }>;
    byType: Record<string, number>;
    total: { all: number; in: number; out: number };
  };

  const transactionStats = useMemo(() => {
    return transactions.reduce(
      (acc, tx) => {
        const month = format(tx.timestamp * 1000, "MMMM yyyy");
        acc.byMonth[month] = acc.byMonth[month] || { all: 0, in: 0, out: 0 };
        acc.byMonth[month].all++;
        acc.total.all++;
        if (accountAddress) {
          const type = tx.from === accountAddress.toLowerCase() ? "out" : "in";
          acc.byMonth[month][type]++;
          acc.byType[type] = (acc.byType[type] || 0) + 1;
          acc.total[type] = (acc.total[type] || 0) + 1;
        }
        return acc;
      },
      {
        byMonth: {},
        byType: { in: 0, out: 0 },
        total: { all: 0, in: 0, out: 0 },
      } as TransactionStats
    );
  }, [transactions, accountAddress]);

  const updateType = (type: "in" | "out" | "all") => {
    setType(type);
    onChange({ dateRange, selectedTokens, type });
  };

  const updateDateRange = (dateRange: {
    start: Date | null;
    end: Date | null;
    label: string;
  }) => {
    setDateRange(dateRange);
    onChange({ dateRange, selectedTokens, type });
  };

  const updateSelectedTokens = (selectedTokens: Token[]) => {
    setSelectedTokens(selectedTokens);
    onChange({ dateRange, selectedTokens, type });
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Date Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-[200px] flex-row justify-start"
          >
            <Calendar className="mr-2 h-4 w-4" />
            {dateRange.label}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[200px]">
          <DropdownMenuLabel>Filter by Date</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() =>
              updateDateRange({ start: null, end: null, label: "All Time" })
            }
          >
            All Time
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              updateDateRange({
                start: startOfToday(),
                end: new Date(),
                label: "Today",
              })
            }
          >
            Today
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>By Month</DropdownMenuLabel>
          {monthOptions.map((option) => (
            <DropdownMenuItem
              key={option.label}
              onClick={() => updateDateRange(option)}
              className="flex justify-between"
            >
              <span
                className={
                  transactionStats.byMonth[option.label]?.all > 0
                    ? ""
                    : "text-muted-foreground"
                }
              >
                {option.label}
              </span>
              <span className="text-muted-foreground">
                {transactionStats.byMonth[option.label]?.all || 0}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Type Filter */}
      {accountAddress && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-[140px] flex-row justify-start"
            >
              {type === "all" ? (
                <div className="flex justify-between w-full items-center">
                  <div className="flex flex-row items-center gap-2">
                    <ArrowLeftRight className="mr-1 h-4 w-4" />
                    All
                  </div>
                  <span className="text-muted-foreground">
                    {dateRange.label === "All Time"
                      ? transactionStats.total.all
                      : transactionStats.byMonth[dateRange.label]?.all}
                  </span>
                </div>
              ) : type === "in" ? (
                <div className="flex justify-between w-full items-center">
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Inbound
                  <span className="text-muted-foreground">
                    {dateRange.label === "All Time"
                      ? transactionStats.total.in
                      : transactionStats.byMonth[dateRange.label]?.in}
                  </span>
                </div>
              ) : (
                <div className="flex justify-between w-full items-center">
                  <ArrowRight className="mr-1 h-4 w-4" />
                  Outbound
                  <span className="text-muted-foreground ml-2">
                    {dateRange.label === "All Time"
                      ? transactionStats.total.out
                      : transactionStats.byMonth[dateRange.label]?.out}
                  </span>
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[120px]">
            <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setType("all")}
              className="flex justify-between"
            >
              All
              <span className="text-muted-foreground">
                {dateRange.label === "All Time"
                  ? transactionStats.total.all
                  : transactionStats.byMonth[dateRange.label]?.all || 0}
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => updateType("in")}
              className="flex justify-between"
            >
              Inbound
              <span className="text-muted-foreground">
                {dateRange.label === "All Time"
                  ? transactionStats.total.in
                  : transactionStats.byMonth[dateRange.label]?.in || 0}
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => updateType("out")}
              className="flex justify-between"
            >
              Outbound
              <span className="text-muted-foreground">
                {dateRange.label === "All Time"
                  ? transactionStats.total.out
                  : transactionStats.byMonth[dateRange.label]?.out || 0}
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Token Filter */}
      {availableTokens.length > 0 && (
        <>
          <Popover open={tokenSelectOpen} onOpenChange={setTokenSelectOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Coins className="h-4 w-4" />
                {selectedTokens.length === 0
                  ? "All Tokens"
                  : `${selectedTokens.length} selected`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search tokens..." />
                <CommandList>
                  <CommandEmpty>No tokens found.</CommandEmpty>
                  <CommandGroup>
                    {availableTokens.map((token) => (
                      <CommandItem
                        key={token.address}
                        value={token.address}
                        className="cursor-pointer"
                        onSelect={() => {
                          if (selectedTokens.includes(token)) {
                            return updateSelectedTokens(
                              selectedTokens.filter((t) => t !== token)
                            );
                          } else {
                            return updateSelectedTokens([
                              ...selectedTokens,
                              token,
                            ]);
                          }
                          // Keep the popover open
                          setTokenSelectOpen(true);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedTokens.includes(token)
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {token.symbol} ({truncateAddress(token.address)})
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </>
      )}

      {/* Selected Token Badges */}
      {selectedTokens.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTokens.map((token) => (
            <Badge
              key={token.address}
              variant="secondary"
              className="flex items-center gap-1"
            >
              {token.symbol} ({truncateAddress(token.address)})
              <button
                className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    updateSelectedTokens(
                      selectedTokens.filter((t) => t !== token)
                    );
                  }
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  updateSelectedTokens(
                    selectedTokens.filter((t) => t !== token)
                  );
                }}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {selectedTokens.length > 0 && (
            <button
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => updateSelectedTokens([])}
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
