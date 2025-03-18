import Transactions from "@/components/Transactions";
import AddressInfo from "@/components/AddressInfo";
import type { Address } from "@/types";
import { getAddressFromENSName } from "@/utils/crypto.server";
import { isAddress } from "ethers";
export default async function Page({
  params,
}: {
  params: Promise<{ chain: string; address: string }>;
}) {
  const { chain, address } = await params;

  if (!address) {
    return <div>Invalid address</div>;
  }

  let addr = address as Address;
  let ensName: string | undefined;
  if (address.endsWith(".eth")) {
    ensName = address;
    addr = (await getAddressFromENSName(address)) as Address;
    if (!addr) {
      return <div>Could not resolve ENS name</div>;
    }
  }

  if (!addr || !isAddress(addr)) {
    return <div>Invalid address</div>;
  }

  return (
    <div className="app">
      <div className="flex flex-col gap-4">
        <AddressInfo
          chain={chain}
          address={addr as Address}
          ensName={ensName}
        />
        <Transactions chain={chain} accountAddress={addr as Address} />
      </div>
    </div>
  );
}
