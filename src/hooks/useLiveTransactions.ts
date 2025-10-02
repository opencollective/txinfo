import { useCallback, useMemo, useRef, useState } from "react";
import { JsonRpcProvider, WebSocketProvider, Log, ethers } from "ethers";
import chains from "@/chains.json";
import { Address, BlockchainTransaction, ChainConfig } from "@/types";
import { getTxFromLog } from "@/utils/crypto";

const TRANSFER_TOPIC = ethers.id("Transfer(address,address,uint256)");

const getFilters = (
  tokenAddress: Address | undefined,
  accountAddress: Address | undefined
) => {
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
      return filters;
    } else {
      const filter = {
        topics: [TRANSFER_TOPIC],
        address: tokenAddress,
      };
      return [filter];
    }
  } else if (accountAddress) {
    const filters = [
      { topics: [TRANSFER_TOPIC, ethers.zeroPadValue(accountAddress, 32)] },
      {
        topics: [TRANSFER_TOPIC, null, ethers.zeroPadValue(accountAddress, 32)],
      },
    ];
    return filters;
  }
  return [];
};

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
  const [transactions, setTransactions] = useState<BlockchainTransaction[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const last10ProcessedTxTimestamp = useRef<number[]>([0]);
  const skippedTransactionsRef = useRef<number>(0);
  const [skippedTransactions, setSkippedTransactions] = useState<number>(0);
  const timePer10Transactions = Math.ceil(
    (60 * 1000) / maxTransactionsPerMinute
  );
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
        last10ProcessedTxTimestamp.current[
          last10ProcessedTxTimestamp.current.length - 1
        ] <
          now - timePer10Transactions
      ) {
        last10ProcessedTxTimestamp.current = [
          now,
          ...last10ProcessedTxTimestamp.current,
        ].slice(0, 10);
        await processLog(log);
      } else {
        console.log(
          ">>> throttling because",
          skippedTransactionsRef.current,
          last10ProcessedTxTimestamp.current,
          "<",
          now - timePer10Transactions,
          "time per transaction",
          timePer10Transactions
        );
        skippedTransactionsRef.current++;
        setSkippedTransactions(skippedTransactionsRef.current);
        if (skippedTransactionsRef.current === 1) {
          console.warn(
            `Rate limit of ${maxTransactionsPerMinute} transactions per minute reached, now counting skipped transactions`
          );
        }
      }
    },
    [maxTransactionsPerMinute, processLog, timePer10Transactions]
  );

  const startPolling = useCallback(
    async (
      tokenAddress: Address | undefined,
      accountAddress: Address | undefined,
      processLog: (log: Log) => void,
      fromBlock?: number,
      interval?: number
    ) => {
      const httpProvider = new JsonRpcProvider(chainConfig.rpc[0]);
      const filters = getFilters(tokenAddress, accountAddress);
      let lastBlock = fromBlock;
      let processingBacklog = false;

      const processBlockRange = async () => {
        if (processingBacklog) {
          console.log(
            ">>> useLiveTransactions skipping because backlog is still being processed"
          );
          return;
        }
        const blockNumber = await httpProvider.getBlockNumber();
        // if no new blocks, skip
        if (lastBlock === blockNumber) {
          return;
        }
        lastBlock = lastBlock ?? blockNumber - 500;

        while (lastBlock < blockNumber) {
          processingBacklog = true;
          const toBlock = Math.min(lastBlock + 500, blockNumber);
          console.log(
            ">>> useLiveTransactions getting logs for block range",
            lastBlock,
            toBlock
          );
          let logsReceived = 0;
          await Promise.all(
            filters.map(async (filter) => {
              const logs = await httpProvider.getLogs({
                ...filter,
                fromBlock: lastBlock,
                toBlock,
              });
              logsReceived += logs.length;
              await Promise.all(logs.map(throttledProcessLog));
            })
          );
          processingBacklog = false;
          lastBlock = toBlock;
          await new Promise((resolve) =>
            setTimeout(resolve, logsReceived * 500)
          );
        }
      };
      try {
        await processBlockRange();
      } catch (error) {
        console.info(
          ">>> error processing block range",
          error instanceof Error ? error.message : error
        );
      }
      setInterval(processBlockRange, interval ?? 20000);
    },
    [chainConfig, throttledProcessLog]
  );

  const startWebsocket = useCallback(
    (
      chain: string,
      tokenAddress: Address | undefined,
      accountAddress: Address | undefined,
      onLog: (log: Log) => void,
      onOpen: () => void,
      onClose: () => void,
      errorCount: number
    ) => {
      console.log(
        ">>> connecting websocket to listen to",
        chain,
        tokenAddress,
        accountAddress
      );
      if (!chainConfig.ws) {
        console.error(`No WebSocket configuration found for chain ${chain}`);
        return;
      }
      const wsUrl = chainConfig.ws[errorCount % chainConfig.ws.length];
      const wsProvider = new WebSocketProvider(wsUrl);

      const filters = getFilters(tokenAddress, accountAddress);

      filters.forEach((filter) =>
        wsProvider.on(filter, (log) => {
          throttledProcessLog(log);
        })
      );

      // return {
      //   close: () => wsProvider.removeAllListeners(),
      // };
    },
    [throttledProcessLog, chainConfig.ws]
  );

  type Options = {
    fromBlock?: number;
    websocket?: boolean;
    interval?: number;
  };

  const start = useCallback(
    (options: Options) => {
      if (!options.websocket || !chainConfig?.ws) {
        startPolling(
          tokenAddress,
          accountAddress,
          processLog,
          options.fromBlock,
          options.interval
        );

        return;
      }

      startWebsocket(
        chain,
        tokenAddress,
        accountAddress,
        processLog,
        () => setIsConnected(true),
        () => setIsConnected(false),
        0
      );
    },
    [
      chainConfig,
      accountAddress,
      tokenAddress,
      processLog,
      startWebsocket,
      chain,
      startPolling,
    ]
  );

  return { transactions, isConnected, skippedTransactions, start };
}
