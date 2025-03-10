import Transactions from "@/components/Transactions";
import AddressInfo from "@/components/AddressInfo";
import type { Address } from "@/types";
export default async function Page({
  params,
}: {
  params: Promise<{ chain: string; tokenAddress: string }>;
}) {
  const { chain, tokenAddress } = await params;
  return (
    <div className="app">
      <div className="flex flex-col gap-4">
        <AddressInfo chain={chain} address={tokenAddress as Address} />
        <Transactions chain={chain} tokenAddress={tokenAddress} />
      </div>
    </div>
  );
}
