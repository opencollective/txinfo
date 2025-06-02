import TxDetails from "@/components/TxDetails";
import History from "@/components/History";
import chains from "@/chains.json";
import { generateURI } from "@/lib/utils";
import { ChainConfig } from "@/types";
export default async function Page({
  params,
}: {
  params: Promise<{ chain: string; tx_id: string }>;
}) {
  const { chain, tx_id } = await params;
  console.log("chain", chain, "tx_id", tx_id);
  const chainConfig = chains[chain as keyof typeof chains] as ChainConfig;
  const uri = generateURI(chainConfig.type, {
    chainId: chainConfig.id,
    txId: tx_id,
  });
  console.log("uri", uri);
  if (!uri) {
    return <div>Invalid URI</div>;
  }
  return (
    <div className="app">
      <div className="flex flex-col gap-4">
        <TxDetails uri={uri} chain={chain} />
        <History uri={uri} />
      </div>
    </div>
  );
}
