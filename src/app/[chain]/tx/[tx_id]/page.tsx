import TxDetails from "@/components/TxDetails";
import History from "@/components/History";
import chains from "@/chains.json";
import { generateURI } from "@/lib/utils";
import { Chain, ChainConfig } from "@/types";
export default async function Page({
  params,
}: {
  params: Promise<{ chain: Chain; tx_id: string }>;
}) {
  const { chain, tx_id } = await params;
  const chainConfig = chains[chain];
  const uri = generateURI(chainConfig.namespace, {
    chainId: chainConfig.id,
    txId: tx_id,
  });
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
