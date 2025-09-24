import chains from "@/chains.json";
import { ChainConfig } from "@/types";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const contractAddress = searchParams.get("address");
  const chain = searchParams.get("chain");
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
  const apicall = `${chainConfig.explorer_api}/v2/api?module=contract&action=getcontractcreation&contractaddresses=${contractAddress}&apikey=${apikey}&chainid=${chainConfig.id}`;
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
