import chains from "@/chains.json";
import { createErrors } from "@/lib/serverUtils";
import type { Chain, ChainConfig, EtherscanResponse } from "@/types/index.d.ts";
import { getTransactions } from "@/utils/crypto.server";

let cache: Record<string, EtherscanResponse> = {};

setInterval(() => {
  cache = {};
}, 1000 * 60); // empty cache every minute

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");
  const chain = searchParams.get("chain") as Chain;
  const contractAddress = searchParams.get("contractaddress");
  if (!chain || !contractAddress) {
    const errors = createErrors({ apiKey: "n/a", chain, contractAddress });
    return Response.json({ error: errors.join(" ") }, { status: 400 });
  }

  const cacheKey = `${chain}:${contractAddress}:${address}`;

  if (cache[cacheKey]) {
    console.log(">>> cache hit", cacheKey);
    return Response.json(
      { ...cache[cacheKey], cached: true },
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const chainConfig = chains[chain];
  const apikey = process.env[`ETHEREUM_ETHERSCAN_API_KEY`];

  if (!apikey) {
    console.error("No API key found for", chainConfig.explorer_api);
    console.error(
      "Please set the API key in the .env file",
      `${chain?.toUpperCase()}_ETHERSCAN_API_KEY`
    );
    return Response.json({ error: "API key not configured" }, { status: 500 });
  }

  try {
    const transactions = await getTransactions(chain, contractAddress, address);
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
