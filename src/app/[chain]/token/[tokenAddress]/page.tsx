import Transactions from "@/components/Transactions";
import AddressInfo from "@/components/AddressInfo";
import type { Address, Chain } from "@/types";
import tokens from "@/tokens.json";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ chain: Chain; tokenAddress: string }>;
  searchParams: Promise<{ a: string }>;
}) {
  const { chain, tokenAddress: token } = await params;
  const { a: accountAddress } = await searchParams;

  // get address for well-known token names
  const chainTokens = tokens[chain as keyof typeof tokens] || {};

  const tokenAddress = token.startsWith("0x")
    ? token
    : (chainTokens[token.toLowerCase() as keyof typeof chainTokens] as Address);

  if (!tokenAddress) {
    return <div>Token not found. ({token})</div>;
  }

  return (
    <div className="app">
      <div className="flex flex-col gap-4">
        <AddressInfo
          chain={chain}
          address={tokenAddress as Address}
          addressType="token"
        />
        <Transactions
          chain={chain}
          tokenAddress={tokenAddress as Address}
          accountAddress={accountAddress as Address}
        />
      </div>
    </div>
  );
}
