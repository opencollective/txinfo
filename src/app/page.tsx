import { ChevronRight, Github, Twitter } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { truncateAddress } from "@/utils/crypto.server";
import { Address } from "@/types";
import Image from "next/image";

const FEATURED_ACCOUNTS = [
  {
    name: "Vitalik.eth on Ethereum",
    uri: "ethereum/address/vitalik.eth",
  },
  {
    name: "Citizen Wallet Gitcoin EOA on Polygon",
    uri: "polygon/address/0x20451461D5b609C5a3256d78F64c4Afee860Dc32",
  },
  {
    name: "Regens Unite Gitcoin on Polygon",
    uri: "polygon/address/0x08e40e1C0681D072a54Fc5868752c02bb3996FFA",
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
            className="h-48 w-48 mb-4 hidden dark:block"
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
        <div className="max-w-2xl mx-auto">
          {/* ... existing search component ... */}
        </div>
      </section>

      {/* How to use Section */}
      <section className="py-4 md:py-8 px-4 md:px-8 bg-muted/30 rounded-lg">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold mb-4">How to use?</h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Just append <code>/:chain/:type/:address</code> to the URL (where
            type is &quot;address&quot;, &quot;tx&quot;, or &quot;token&quot;;
            i.e. same pattern as on etherscan).
          </p>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            A new Nostr user will be automatically created and saved in your
            local storage. If you want to use your own <code>nsec</code>, just
            enter
            <code>localStorage.setItem(&quot;nostr_nsec&quot;, nsec)</code> in
            the console.
          </p>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Questions? Feedback? Please{" "}
            <a href="https://github.com/xdamman/txinfo/issues">
              create an issue on Github
            </a>{" "}
            or reach out on{" "}
            <a href="nostr:npub1xsp9fcq340dzaqjctjl7unu3k0c82jdxc350uqym70k8vedzuvdst562dr">
              Nostr
            </a>
            .
          </p>
        </div>
      </section>

      {/* Featured Accounts */}
      <section className="py-4 md:py-8 px-4 md:px-8">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold mb-6">Examples</h2>
          <div className="grid gap-4">
            {FEATURED_ACCOUNTS.map(({ name, uri }) => (
              <Link
                key={uri}
                href={`/${uri}`}
                className="flex items-center justify-between p-4 rounded-lg border 
                  hover:bg-muted/50 active:bg-muted 
                  transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="font-medium">{name}</span>
                    <span className="text-sm text-muted-foreground">
                      {uri.indexOf("0x") > 0
                        ? uri.replace(
                            /0x.{40}/,
                            truncateAddress(uri.split("/")[2] as Address)
                          )
                        : uri}
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
      <section className="py-4 md:py-8 px-4 md:px-8 bg-muted/30 rounded-lg">
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

      {/* Features Section */}
      <section className="py-4 md:py-8 px-4 md:px-8 sm:px-4">
        <div className="max-w-2xl mx-auto">
          <div className="grid gap-6">
            <Card className="p-6 shadow-none">
              <h3 className="text-lg font-medium mb-2">🤝 Collaborative</h3>
              <p className="text-muted-foreground">
                Anyone can contribute metadata to any transaction or address.
              </p>
            </Card>

            <Card className="p-6 shadow-none">
              <h3 className="text-lg font-medium mb-2">🌐 Decentralized</h3>
              <p className="text-muted-foreground">
                No single server, data is distributed across Nostr relays.
              </p>
            </Card>

            <Card className="p-6 shadow-none">
              <h3 className="text-lg font-medium mb-2">🔌 Easy to integrate</h3>
              <p className="text-muted-foreground">
                Simple API to post or listen to metadata updates via Nostr.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-16 py-8 px-4 md:px-8 border-t text-sm">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/xdamman/txinfo"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="h-5 w-5" />
              <span>Contribute on GitHub</span>
            </a>
            <a
              href="https://twitter.com/xdamman"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Twitter className="h-5 w-5" />
              <span>@xdamman</span>
            </a>
          </div>
          <a
            href="nostr:npub1xsp9fcq340dzaqjctjl7unu3k0c82jdxc350uqym70k8vedzuvdst562dr"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <img src="/nostr.svg" className="h-5 w-5 dark:invert" />
            <span>xavierdamman.com</span>
          </a>
        </div>
      </footer>
    </main>
  );
}
