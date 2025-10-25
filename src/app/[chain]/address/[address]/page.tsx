import chains from "@/chains.json";
import AddressInfo from "@/components/AddressInfo";
import Transactions from "@/components/Transactions";
import type { Address, Chain, ChainConfig } from "@/types";
import { getAddressFromENSName } from "@/utils/crypto.server";
import { c32addressDecode } from "c32check";
import { isAddress } from "ethers";

const isValidAddress = (chainConfig: ChainConfig, address: Address) => {
  if (!address) return false;
  if (chainConfig.namespace === "eip155") {
    return isAddress(address);
  } else if (chainConfig.namespace === "stacks") {
    try {
      return c32addressDecode(address.toUpperCase()) !== null;
    } catch (error) {
      return false;
    }
  }
  return false;
}

export default async function Page({
  params,
}: {
  params: Promise<{ chain: Chain; address: string }>;
}) {
  const { chain, address } = await params;
  const chainConfig = chains[chain];

  if (!address) {
    return <div>Invalid address</div>;
  }

  let addr = address as Address;
  let ensName: string | undefined;
  if (address.endsWith(".eth")) {
    ensName = address;
    addr = (await getAddressFromENSName(ensName)) as Address;
    if (!addr) {
      return <div>Could not resolve ENS name</div>;
    }
  }

  if (!addr || !isValidAddress(chainConfig, addr)) {
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
