import chains from "@/chains.json";
import type { ChainConfig, EtherscanResponse } from "@/types/index.d.ts";

let cache: Record<string, EtherscanResponse> = {};

setInterval(() => {
  cache = {};
}, 1000 * 180); // empty cache every 3 minutes

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");
  const chain = searchParams.get("chain");
  const contractaddress = searchParams.get("contractaddress");

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

  const params = new URLSearchParams({
    module: "account",
    action: "tokentx",
    startblock: "0",
    endblock: "99999999",
    sort: "desc",
    apikey: apikey || "",
  });

  // Add optional filters
  if (address) {
    params.set("address", address);
  }
  if (contractaddress) {
    params.set("contractaddress", contractaddress);
  }

  if (!chainConfig.explorer_api) {
    throw new Error(`No explorer API found for chain ${chain}`);
  }

  const apicall = `${chainConfig.explorer_api}/api?${params.toString()}`;

  const response = await fetch(apicall);
  const data = await response.json();
  if (data.status === "1") {
    cache[cacheKey] = data;
    return Response.json(data, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400",
      },
    });
  }
  console.error("Failed to fetch contract info", data);
  return Response.json(
    { error: `Failed to fetch contract info (${data?.result})` },
    { status: 500 }
  );
}
