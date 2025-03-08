import Transactions from "@/components/Transactions";
import AddressInfo from "@/components/AddressInfo";
import type { Address } from "@/types";
export default async function Page({
  params,
}: {
  params: Promise<{ chain: string; address: string }>;
}) {
  const { chain, address } = await params;
  return (
    <div className="app">
      <div className="flex flex-col gap-4">
        <AddressInfo chain={chain} address={address as Address} />
        <Transactions chain={chain} address={address} />
      </div>
    </div>
  );
}
