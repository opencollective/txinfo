import TxDetails from "@/components/TxDetails";
import Metadata from "@/components/Metadata";
import chains from "@/chains.json";
import { URI } from "@/providers/NostrProvider";
export default async function Page({
  params,
}: {
  params: Promise<{ chain: string; tx_hash: string }>;
}) {
  const { chain, tx_hash } = await params;
  const chainConfig = chains[chain as keyof typeof chains];
  const uri = `${chainConfig.id}:tx:${tx_hash}`.toLowerCase() as URI;
  return (
    <div className="app">
      <div className="flex flex-col gap-4">
        <TxDetails uri={uri} chain={chain} />
        <Metadata uri={uri} />
      </div>
    </div>
  );
}
