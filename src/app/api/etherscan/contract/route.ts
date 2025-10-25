import chains from "@/chains.json";
import { createErrors } from "@/lib/serverUtils";
import { Chain, ChainConfig } from "@/types";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const contractAddress = searchParams.get("address");
  const chain = searchParams.get("chain") as Chain;
  const apiKey = process.env[`ETHEREUM_ETHERSCAN_API_KEY`];
  
  if (!apiKey || !chain) {
    const errors = createErrors({ apiKey, chain, contractAddress });
    return Response.json({ error: errors.join(" ") }, { status: 500 });
  }

  const chainConfig = chains[chain];
  const apicall = `${chainConfig.explorer_api}/v2/api?module=contract&action=getcontractcreation&contractaddresses=${contractAddress}&apikey=${apiKey}&chainid=${chainConfig.id}`;
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
