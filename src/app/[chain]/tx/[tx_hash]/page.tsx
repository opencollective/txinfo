import TxDetails from "@/components/TxDetails";
import History from "@/components/History";
import chains from "@/chains.json";
import { generateURI } from "@/lib/utils";
import { ChainConfig } from "@/types";
export default async function Page({
  params,
}: {
  params: Promise<{ chain: string; tx_hash: string }>;
}) {
  const { chain, tx_hash } = await params;
  const chainConfig = chains[chain as keyof typeof chains] as ChainConfig;
  const uri = generateURI(chainConfig.type, {
    chainId: chainConfig.id,
    txHash: tx_hash,
  });
  return (
    <div className="app">
      <div className="flex flex-col gap-4">
        <TxDetails uri={uri} chain={chain} />
        <History uri={uri} />
      </div>
    </div>
  );
}
