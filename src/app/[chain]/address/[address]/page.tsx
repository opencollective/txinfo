import Transactions from "@/components/Transactions";
import AddressInfo from "@/components/AddressInfo";
export default async function Page({
  params,
}: {
  params: Promise<{ chain: string; address: string }>;
}) {
  const { chain, address } = await params;
  return (
    <div className="app">
      <div className="flex flex-col gap-4">
        <AddressInfo chain={chain} address={address} />
        <Transactions chain={chain} address={address} />
      </div>
    </div>
  );
}
