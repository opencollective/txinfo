import chains from "@/chains.json";
import type { ChainConfig, EtherscanResponse } from "@/types/index.d.ts";
import { getTransactions } from "@/utils/crypto.server";

let cache: Record<string, EtherscanResponse> = {};

setInterval(() => {
  cache = {};
}, 1000 * 60); // empty cache every minute

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");
  const chain = searchParams.get("chain");
  const contractaddress = searchParams.get("contractaddress");
  if (!chain) {
    return Response.json({ error: "Missing chain" }, { status: 400 });
  }
  if (!address && !contractaddress) {
    return Response.json(
      { error: "Missing address or contractaddress" },
      { status: 400 }
    );
  }

  const cacheKey = `${chain}:${contractaddress}:${address}`;

  if (cache[cacheKey]) {
    console.log(">>> cache hit", cacheKey);
    return Response.json(
      { ...cache[cacheKey], cached: true },
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const chainConfig: ChainConfig = chains[chain as keyof typeof chains];
  const apikey = process.env[`${chain?.toUpperCase()}_ETHERSCAN_API_KEY`];

  if (!apikey) {
    console.error("No API key found for", chainConfig.explorer_api);
    console.error(
      "Please set the API key in the .env file",
      `${chain?.toUpperCase()}_ETHERSCAN_API_KEY`
    );
    return Response.json({ error: "API key not configured" }, { status: 500 });
  }

  try {
    const transactions = await getTransactions(chain, contractaddress, address);
    return Response.json(transactions, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400",
      },
    });
  } catch (e) {
    console.error(e);
    return Response.json(
      { error: `Failed to fetch transactions` },
      { status: 500 }
    );
  }
}
