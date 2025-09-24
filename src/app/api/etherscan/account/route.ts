import chains from "@/chains.json";
import type { ChainConfig } from "@/types/index.d.ts";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");
  const chain = searchParams.get("chain");
  const tokenAddress = searchParams.get("tokenAddress");
  const chainConfig: ChainConfig = chains[chain as keyof typeof chains];
  const apikey = process.env[`ETHEREUM_ETHERSCAN_API_KEY`];

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
    chainid: chainConfig.id.toString(),
    apikey: apikey || "",
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
