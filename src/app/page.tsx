import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const FEATURED_ACCOUNTS = [
  {
    name: "Citizen Spring Safe Multisig",
    address: "0x6fDF0AaE33E313d9C98D2Aa19Bcd8EF777912CBf",
    chain: "gnosis",
  },
  {
    name: "Citizen Wallet EOA",
    address: "0x20451461D5b609C5a3256d78F64c4Afee860Dc32",
    chain: "gnosis",
  },
  {
    name: "Regens Unite Multisig",
    address: "0x371cA2c8f1D02864C7306e5E5Ed5DC6edF2DD19c",
    chain: "gnosis",
  },
];

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="py-20 px-8 text-center ">
        <h1 className="text-4xl font-bold mb-4">TxInfo.xyz</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Add metadata to any blockchain transaction using Nostr
        </p>
        <div className="max-w-2xl mx-auto">
          {/* ... existing search component ... */}
        </div>
      </section>

      {/* Featured Accounts */}
      <section className="py-16 px-8">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold mb-6">Featured Accounts</h2>
          <div className="grid gap-4">
            {FEATURED_ACCOUNTS.map(({ name, address, chain }) => (
              <Link
                key={address}
                href={`/${chain}/address/${address}`}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="font-medium">{name}</span>
                    <span className="text-sm text-muted-foreground">
                      {address.slice(0, 6)}...{address.slice(-4)}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-8 bg-muted/50">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold mb-2">
            The Missing Metadata Layer
          </h2>
          <p className="text-muted-foreground mb-8">
            A decentralized way to add human context to blockchain transactions
          </p>

          <div className="grid gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-medium mb-2">🤝 Collaborative</h3>
              <p className="text-muted-foreground">
                Anyone can contribute metadata to any transaction or address
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-medium mb-2">🌐 Decentralized</h3>
              <p className="text-muted-foreground">
                No single server, data is distributed across Nostr relays
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-medium mb-2">🔌 Easy to integrate</h3>
              <p className="text-muted-foreground">
                Simple API to post or listen to metadata updates via Nostr
              </p>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}
