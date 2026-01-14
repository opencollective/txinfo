import chains from "@/chains.json";
import type {
  Address,
  Chain,
  EtherscanTransfer
} from "@/types/index.d.ts";
import { JsonRpcProvider } from "ethers";

export function truncateAddress(address: Address) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

const ensNameCache = new Map<Address, string>();
const pendingRequests = new Map<Address, Promise<string | undefined>>();

export async function getENSNameFromAddress(address: Address) {
  if (ensNameCache.has(address)) {
    return ensNameCache.get(address);
  }

  // If there's already a pending request for this address, return that promise
  if (pendingRequests.has(address)) {
    return pendingRequests.get(address);
  }

  // Create a new promise for this request
  const promise = (async () => {
    try {
      const provider = new JsonRpcProvider(chains["ethereum"].rpc[1]);
      const ensName = await provider.lookupAddress(address);
      if (ensName) {
        ensNameCache.set(address, ensName);
      }
      return ensName || undefined;
    } catch (error) {
      console.error(">>> getENSNameFromAddress error getting ENS name", error);
      return undefined;
    } finally {
      // Clean up the pending request after it's done
      pendingRequests.delete(address);
    }
  })();

  // Store the promise in pendingRequests
  pendingRequests.set(address, promise);
  return promise;
}

const ensAddressCache = new Map<string, Address>();
export async function getAddressFromENSName(ensName: string) {
  if (ensAddressCache.has(ensName)) {
    return ensAddressCache.get(ensName);
  }
  try {
    // const rpcIndex = Math.floor(Math.random() * chains["ethereum"].rpc.length);
    const provider = new JsonRpcProvider(chains["ethereum"].rpc[0]);
    const address = await provider.resolveName(ensName);
    if (address) {
      ensAddressCache.set(ensName, address as Address);
    }
    return address as Address;
  } catch (error) {
    console.error(">>> error getting address from ENS name", error);
    return undefined;
  }
}

interface ENSDetails {
  address: Address;
  name?: string;
  description?: string;
  avatar?: string;
  url?: string;
}

const ensDetailsCache = new Map<Address, ENSDetails>();
const pendingDetailsRequests = new Map<Address, Promise<ENSDetails>>();

export async function getENSDetailsFromAddress(
  address: Address
): Promise<ENSDetails> {
  if (ensDetailsCache.has(address)) {
    return ensDetailsCache.get(address)!;
  }

  if (pendingDetailsRequests.has(address)) {
    return pendingDetailsRequests.get(address)!;
  }

  const promise = (async () => {
    try {
      const provider = new JsonRpcProvider(chains["ethereum"].rpc[1]);
      const details: ENSDetails = { address };

      const ensName = await provider.lookupAddress(address);
      if (ensName) {
        details.name = ensName;
        try {
          const resolver = await provider.getResolver(ensName);
          if (resolver) {
            // Define all the records we want to fetch (max 3 per batch when using free RPC)
            const recordNames = ["avatar", "url"];

            // Fetch all records in parallel
            const records = await Promise.all(
              recordNames.map((record) => resolver.getText(record))
            );

            if (records[0]) {
              details.avatar = records[0];
            }

            if (records[1]) {
              details.url = records[1];
            }
          }
        } catch (e) {
          console.error(
            ">>> getENSDetailsFromAddress error getting ENS details for address",
            address,
            e
          );
        }
      }

      ensDetailsCache.set(address, details);
      return details;
    } catch (error) {
      console.error(
        ">>> getENSDetailsFromAddress error resolving ENS address",
        address,
        error
      );
      return { address };
    } finally {
      pendingDetailsRequests.delete(address);
    }
  })();

  pendingDetailsRequests.set(address, promise);
  return promise;
}

let cache: Record<string, EtherscanTransfer[]> = {};

setInterval(() => {
  cache = {};
}, 1000 * 60); // empty cache every minute

export async function getTransactions(
  chain: Chain,
  contractaddress: string | null,
  address?: string | null,
  type: "token" | "native" = "token"
): Promise<EtherscanTransfer[]> {
  const chainConfig = chains[chain];
  const apikey = process.env[`${chain?.toUpperCase()}_ETHERSCAN_API_KEY`];
  if (!apikey) {
    console.error("No API key found for", chainConfig.explorer_api);
    console.error(
      "Please set the API key in the .env file",
      `${chain?.toUpperCase()}_ETHERSCAN_API_KEY`
    );
    throw new Error("API key not configured");
  }

  if (!chainConfig.explorer_api) {
    throw new Error(`No explorer API found for chain ${chain}`);
  }

  const cacheKey = `${chain}:${contractaddress}:${address}:${type}`;
  if (cache[cacheKey]) {
    console.log(">>> cache hit", cacheKey);
    return cache[cacheKey];
  }

  const params = new URLSearchParams({
    module: "account",
    action: type === "token" ? "tokentx" : "txlist",
    startblock: "0",
    endblock: "99999999",
    sort: "desc",
    chainid: chainConfig.id.toString(),
    apikey: apikey || "",
  });

  // Add optional filters
  if (address) {
    params.set("address", address);
  }
  if (contractaddress && type === "token") {
    params.set("contractaddress", contractaddress);
  }

  const apicall = `${chainConfig.explorer_api}/v2/api?${params.toString()}`;
  const response = await fetch(apicall);
  const data = await response.json();

  if (type !== "token") {
    const nativeToken =
      chainConfig.native_token || chains["ethereum"].native_token;
    const res = (data.result as EtherscanTransfer[]) || [];

    if (type !== "native") {
      const nativeTxs = await getTransactions(
        chain,
        contractaddress,
        address,
        "native"
      );
      if (Array.isArray(nativeTxs) && nativeTxs.length > 0 && nativeToken) {
        res.push(
          ...nativeTxs.map((tx) => {
            return {
              ...tx,
              contractAddress:
                "0x0000000000000000000000000000000000000000" as Address,
              tokenSymbol: nativeToken.symbol,
              tokenName: nativeToken.name,
              tokenDecimal: nativeToken.decimals.toString(),
            };
          })
        );
        res.sort((a, b) => b.blockNumber - a.blockNumber);
      }
    }
  }
  cache[cacheKey] = data.result;

  return data.result;
}
