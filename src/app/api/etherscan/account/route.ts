import chains from "@/chains.json";
import { createErrors } from "@/lib/serverUtils";
import type { Chain, ChainConfig } from "@/types/index.d.ts";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");
  const chain = searchParams.get("chain") as Chain;
  const tokenAddress = searchParams.get("tokenAddress");
  const apiKey = process.env[`ETHEREUM_ETHERSCAN_API_KEY`];

  if (!apiKey || !chain) {
    const errors = createErrors({ apiKey, chain, contractAddress: tokenAddress });
    return Response.json({ error: errors.join(" ") }, { status: 500 });
  }

  const chainConfig: ChainConfig = chains[chain];

  const params = new URLSearchParams({
    module: "account",
    action: "tokentx",
    startblock: "0",
    endblock: "99999999",
    sort: "desc",
    chainid: chainConfig.id.toString(),
    apikey: apiKey || "",
  });

  // Add optional filters
  if (address) {
    params.set("address", address);
  }
  if (tokenAddress) {
    params.set("contractaddress", tokenAddress);
  }

  const apicall = `${chainConfig.explorer_api}/v2/api?${params.toString()}`;

  const response = await fetch(apicall);
  const data = await response.json();
  if (data.status === "1") {
    return Response.json(data, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400",
      },
    });
  }
  return Response.json(
    { error: "Failed to fetch contract info" },
    { status: 500 }
  );
}
