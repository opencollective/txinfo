import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { JsonRpcProvider, WebSocketProvider, Log, ethers } from "ethers";
import chains from "@/chains.json";
import { Address, ChainConfig, Transaction } from "@/types";
import { getTxFromLog } from "@/utils/crypto";

const TRANSFER_TOPIC = ethers.id("Transfer(address,address,uint256)");

export function useLiveTransactions({
  chain,
  tokenAddress,
  accountAddress,
  maxTransactionsPerMinute = 100, // default limit
}: {
  chain: string;
  tokenAddress?: Address;
  accountAddress?: Address;
  maxTransactionsPerMinute?: number;
}) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const lastProcessedTxTimestamp = useRef<number>(0);
  const skippedTransactionsRef = useRef<number>(0);
  const [skippedTransactions, setSkippedTransactions] = useState<number>(0);
  const timePerTransaction = (60 * 1000) / maxTransactionsPerMinute;

  const chainConfig: ChainConfig = chains[chain as keyof typeof chains];
  // if (!chainConfig?.ws) {
  //   console.error(`No WebSocket configuration found for chain ${chain}`);
  //   return null;
  // }
  const httpProvider = useMemo(
    () => new JsonRpcProvider(chainConfig.rpc[0]),
    [chainConfig]
  );

  const processLog = useCallback(
    async (log: Log) => {
      const tx = await getTxFromLog(chain, log, httpProvider);
      console.log("useLiveTransactions processLog: tx", tx);
      setTransactions((prev) => [tx, ...prev].slice(0, 50));
    },
    [httpProvider, chain]
  );

  // Process transactions if under the rate limit, otherwise skip (and increment skippedTransactions)
  const throttledProcessLog = useCallback(
    async (log: Log) => {
      // Process log if under rate limit
      const now = Date.now();
      if (
        skippedTransactionsRef.current === 0 &&
        lastProcessedTxTimestamp.current < now - timePerTransaction
      ) {
        console.log(
          ">>> processLog because",
          skippedTransactionsRef.current,
          lastProcessedTxTimestamp.current,
          " < ",
          now - timePerTransaction
        );
        lastProcessedTxTimestamp.current = now;
        await processLog(log);
      } else {
        skippedTransactionsRef.current++;
        setSkippedTransactions(skippedTransactionsRef.current);
        if (skippedTransactionsRef.current === 1) {
          console.warn(
            `Rate limit of ${maxTransactionsPerMinute} transactions per minute reached, now counting skipped transactions`
          );
        }
      }
    },
    [maxTransactionsPerMinute, processLog, timePerTransaction]
  );

  const setupWebSocket = useCallback(
    (
      chain: string,
      tokenAddress: Address | undefined,
      accountAddress: Address | undefined,
      onLog: (log: Log) => void,
      onOpen: () => void,
      onClose: () => void,
      errorCount: number
    ) => {
      const chainConfig: ChainConfig = chains[chain as keyof typeof chains];
      if (!chainConfig?.ws) {
        console.error(`No WebSocket configuration found for chain ${chain}`);
        return { transactions: [], isConnected: false };
      }

      console.log(
        ">>> connecting websocket to listen to",
        chain,
        tokenAddress,
        accountAddress
      );
      const wsUrl = chainConfig.ws[errorCount % chainConfig.ws.length];
      const wsProvider = new WebSocketProvider(wsUrl);

      if (tokenAddress) {
        if (accountAddress) {
          const filters = [
            {
              topics: [TRANSFER_TOPIC, ethers.zeroPadValue(accountAddress, 32)],
              address: tokenAddress,
            },
            {
              topics: [
                TRANSFER_TOPIC,
                null,
                ethers.zeroPadValue(accountAddress, 32),
              ],
              address: tokenAddress,
            },
          ];
          filters.forEach((filter) =>
            wsProvider.on(filter, (log) => {
              throttledProcessLog(log);
            })
          );
        } else {
          const filter = {
            topics: [TRANSFER_TOPIC],
            address: tokenAddress,
          };
          wsProvider.on(filter, (log) => {
            throttledProcessLog(log);
          });
        }
      } else if (accountAddress) {
        const filters = [
          { topics: [TRANSFER_TOPIC, ethers.zeroPadValue(accountAddress, 32)] },
          {
            topics: [
              TRANSFER_TOPIC,
              null,
              ethers.zeroPadValue(accountAddress, 32),
            ],
          },
        ];
        filters.forEach((filter) =>
          wsProvider.on(filter, (log) => {
            throttledProcessLog(log);
          })
        );
      }
      // return {
      //   close: () => wsProvider.removeAllListeners(),
      // };
    },
    [throttledProcessLog]
  );

  useEffect(() => {
    setupWebSocket(
      chain,
      tokenAddress,
      accountAddress,
      processLog,
      () => setIsConnected(true),
      () => setIsConnected(false),
      0
    );

    return () => {
      // socket?.close();
    };
  }, [chain, accountAddress, tokenAddress, processLog, setupWebSocket]);

  return { transactions, isConnected, skippedTransactions };
}
