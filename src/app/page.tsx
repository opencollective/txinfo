import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { truncateAddress } from "@/utils/crypto.server";
import { Address } from "@/types";
import Image from "next/image";
import LatestNotes from "@/components/LatestNotes";
import { Suspense } from "react";
import SearchForm from "@/components/SearchForm";

const FEATURED_ACCOUNTS = [
  {
    name: "Citizen Spring / commonshub.brussels",
    path: "/gnosis/address/0x6fDF0AaE33E313d9C98D2Aa19Bcd8EF777912CBf",
  },
  {
    name: "Citizen Wallet Gitcoin EOA on Polygon",
    path: "/polygon/address/0x20451461D5b609C5a3256d78F64c4Afee860Dc32",
  },
  {
    name: "Regens Unite Gitcoin on Celo",
    path: "/celo/address/0x08e40e1C0681D072a54Fc5868752c02bb3996FFA",
  },
  {
    name: "Vitalik.eth on Ethereum",
    path: "/ethereum/address/vitalik.eth",
  },
];

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="py-20 px-4 md:px-8 text-center">
        <div className="flex justify-center items-center">
          <Image
            src="/txinfo-light.svg"
            className="h-48 w-48 mb-4 block dark:hidden"
            alt="TxInfo Logo"
            width={96}
            height={96}
          />
          <Image
            src="/txinfo-dark.svg"
            className="h-48 w-48 mb-4 hidden dark:block text-red-700"
            alt="TxInfo Logo"
            width={96}
            height={96}
          />
        </div>
        <h1 className="text-4xl font-bold mb-4">
          TxInfo<span className="text-muted-foreground text-sm">.xyz</span>
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          Add metadata to any blockchain transaction using Nostr
        </p>
        <div className="max-w-2xl mx-auto py-6">
          <SearchForm />
        </div>
      </section>

      {/* How to use Section */}
      <section className="py-4 md:py-8 px-4 md:px-8 rounded-lg">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold mb-4">How to use?</h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Just append <code>/:chain/:type/:address</code> to the txinfo.xyz
            URL (where type is &quot;address&quot;, &quot;tx&quot;, or
            &quot;token&quot;; i.e. same pattern as on etherscan).
            <br />
            <span className="text-sm sm:text-base">
              E.g.{" "}
              <Link href="https://txinfo.xyz/ethereum/address/uniswap.eth">
                txinfo.xyz/ethereum/address/uniswap.eth
              </Link>
            </span>
          </p>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            A new Nostr user will be automatically created and saved in your
            local storage. <br />
            Questions? Feedback? Please{" "}
            <a href="https://github.com/opencollective/txinfo/issues">
              create an issue on Github
            </a>{" "}
            or reach out on{" "}
            <a href="nostr:npub1xsp9fcq340dzaqjctjl7unu3k0c82jdxc350uqym70k8vedzuvdst562dr">
              Nostr
            </a>
            .
          </p>
          <div className="text-xs sm:text-sm rounded-md bg-muted p-2">
            ℹ️ Protip: Tap on the floating round button (bottom right) to add a
            username and avatar or to use your own Nostr private key (nsec).
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-4 md:py-8 px-4 md:px-8 sm:px-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-4">
            <Card className="p-6 shadow-none w-full sm:w-1/3">
              <h3 className="text-lg font-medium mb-2">🤝 Collaborative</h3>
              <p className="text-muted-foreground">
                Anyone can contribute metadata to any blockchain transaction or
                address.
              </p>
            </Card>

            <Card className="p-6 shadow-none w-full sm:w-1/3">
              <h3 className="text-lg font-medium mb-2">🌐 Decentralized</h3>
              <p className="text-muted-foreground">
                No single server, data is distributed across Nostr relays.
              </p>
            </Card>

            <Card className="p-6 shadow-none w-full sm:w-1/3">
              <h3 className="text-lg font-medium mb-2">🔌 Easy to integrate</h3>
              <p className="text-muted-foreground">
                Simple API to post or listen to metadata updates via Nostr.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Featured Accounts */}
      <section className="py-4 md:py-8 px-4 md:px-8">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold mb-6">Examples</h2>
          <div className="grid gap-4">
            {FEATURED_ACCOUNTS.map(({ name, path }) => (
              <Link
                key={path}
                href={path}
                className="flex items-center justify-between p-4 rounded-lg border 
                  hover:bg-muted/50 active:bg-muted 
                  transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="font-medium">{name}</span>
                    <span className="text-sm text-muted-foreground">
                      {path.indexOf("0x") > 0
                        ? path.replace(
                            /0x.{40}/,
                            truncateAddress(path.split("/")[3] as Address)
                          )
                        : path}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why Section */}
      <section className="py-4 md:py-8 px-4 md:px-8 rounded-lg">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold mb-4">Why TxInfo?</h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Blockchain transactions are cryptic by nature - just addresses and
            amounts. But behind each transaction is a human story: a donation to
            a cause, a payment for services, or a gift to a friend. TxInfo lets
            you add this missing context, making blockchain data more meaningful
            and accessible to everyone. Built on Nostr, it&apos;s decentralized,
            censorship-resistant, and always available.
          </p>
        </div>
      </section>

      {/* Latest Notes */}
      <section className="py-4 md:py-8 px-4 md:px-8 bg-muted/30 rounded-lg">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold mb-4">
            Latest metadata submitted
          </h2>

          <Suspense fallback={<div>Loading latest metadata published...</div>}>
            <LatestNotes />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
