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
    name: "Regens Unite Gitcoin on Celo",
    uri: "celo/address/0x08e40e1C0681D072a54Fc5868752c02bb3996FFA",
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
        <div className="max-w-2xl mx-auto">
          {/* ... existing search component ... */}
        </div>
      </section>

      {/* How to use Section */}
      <section className="py-4 md:py-8 px-4 md:px-8 bg-muted/30 rounded-lg">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold mb-4">How to use?</h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Just append <code>/:chain/:type/:address</code> to the txinfo.xyz
            URL (where type is &quot;address&quot;, &quot;tx&quot;, or
            &quot;token&quot;; i.e. same pattern as on etherscan).
            <div className="text-sm sm:text-base">
              E.g.{" "}
              <Link href="https://txinfo.xyz/ethereum/address/uniswap.eth">
                txinfo.xyz/ethereum/address/uniswap.eth
              </Link>
            </div>
          </p>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            A new Nostr user will be automatically created and saved in your
            local storage. <br />
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
          <div className="text-xs sm:text-sm rounded-md bg-muted/50 p-2">
            ℹ️ Protip: if you want to use your own <code>nsec</code>, just enter
            in the console:
            <div className="py-2">
              <code className="text-xs">
                localStorage.setItem(&quot;nostr_nsec&quot;, nsec)
              </code>
            </div>
          </div>
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
            <svg
              className="h-5 w-5 text-muted-foreground"
              viewBox="0 0 875 875"
            >
              <path
                fill="currentColor"
                d="m684.72,485.57c.22,12.59-11.93,51.47-38.67,81.3-26.74,29.83-56.02,20.85-58.42,20.16s-3.09-4.46-7.89-3.77-9.6,6.17-18.86,7.2-17.49,1.71-26.06-1.37c-4.46.69-5.14.71-7.2,2.24s-17.83,10.79-21.6,11.47c0,7.2-1.37,44.57,0,55.89s3.77,25.71,7.54,36c3.77,10.29,2.74,10.63,7.54,9.94s13.37.34,15.77,4.11c2.4,3.77,1.37,6.51,5.49,8.23s60.69,17.14,99.43,19.2c26.74.69,42.86,2.74,52.12,19.54,1.37,7.89,7.54,13.03,11.31,14.06s8.23,2.06,12,5.83,1.03,8.23,5.49,11.66c4.46,3.43,14.74,8.57,25.37,13.71,10.63,5.14,15.09,13.37,15.77,16.11s1.71,10.97,1.71,10.97c0,0-8.91,0-10.97-2.06s-2.74-5.83-2.74-5.83c0,0-6.17,1.03-7.54,3.43s.69,2.74-7.89.69-11.66-3.77-18.17-8.57c-6.51-4.8-16.46-17.14-25.03-16.8,4.11,8.23,5.83,8.23,10.63,10.97s8.23,5.83,8.23,5.83l-7.2,4.46s-4.46,2.06-14.74-.69-11.66-4.46-12.69-10.63,0-9.26-2.74-14.4-4.11-15.77-22.29-21.26c-18.17-5.49-66.52-21.26-100.12-24.69s-22.63-2.74-28.11-1.37-15.77,4.46-26.4-1.37c-10.63-5.83-16.8-13.71-17.49-20.23s-1.71-10.97,0-19.2,3.43-19.89,1.71-26.74-14.06-55.89-19.89-64.12c-13.03,1.03-50.74-.69-50.74-.69,0,0-2.4-.69-17.49,5.83s-36.48,13.76-46.77,19.93-14.4,9.7-16.12,13.13c.12,3-1.23,7.72-2.79,9.06s-12.48,2.42-12.48,2.42c0,0-5.85,5.86-8.25,9.97-6.86,9.6-55.2,125.14-66.52,149.83-13.54,32.57-9.77,27.43-37.71,27.43s-8.06.3-8.06.3c0,0-12.34,5.88-16.8,5.88s-18.86-2.4-26.4,0-16.46,9.26-23.31,10.29-4.95-1.34-8.38-3.74c-4-.21-14.27-.12-14.27-.12,0,0,1.74-6.51,7.91-10.88,8.23-5.83,25.37-16.11,34.63-21.26s17.49-7.89,23.31-9.26,18.51-6.17,30.51-9.94,19.54-8.23,29.83-31.54c10.29-23.31,50.4-111.43,51.43-116.23.63-2.96,3.73-6.48,4.8-15.09.66-5.35-2.49-13.04,1.71-22.63,10.97-25.03,21.6-20.23,26.4-20.23s17.14.34,26.4-1.37,15.43-2.74,24.69-7.89,11.31-8.91,11.31-8.91l-19.89-3.43s-18.51.69-25.03-4.46-15.43-15.77-15.43-15.77l-7.54-7.2,1.03,8.57s-5.14-8.91-6.51-10.29-8.57-6.51-11.31-11.31-7.54-25.03-7.54-25.03l-6.17,13.03-1.71-18.86-5.14,7.2-2.74-16.11-4.8,8.23-3.43-14.4-5.83,4.46-2.4-10.29-5.83-3.43s-14.06-9.26-16.46-9.6-4.46,3.43-4.46,3.43l1.37,12-12.2-6.27-7-11.9s2.36,4.01-9.62,7.53c-20.55,0-21.89-2.28-24.93-3.94-1.31-6.56-5.57-10.11-5.57-10.11h-20.57l-.34-6.86-7.89,3.09.69-10.29h-14.06l1.03-11.31h-8.91s3.09-9.26,25.71-22.97,25.03-16.46,46.29-17.14c21.26-.69,32.91,2.74,46.29,8.23s38.74,13.71,43.89,17.49c11.31-9.94,28.46-19.89,34.29-19.89,1.03-2.4,6.19-12.33,17.96-17.6,35.31-15.81,108.13-34,131.53-35.54,31.2-2.06,7.89-1.37,39.09,2.06,31.2,3.43,54.17,7.54,69.6,12.69,12.58,4.19,25.03,9.6,34.29,2.06,4.33-1.81,11.81-1.34,17.83-5.14,30.69-25.09,34.72-32.35,43.63-41.95s20.14-24.91,22.54-45.14,4.46-58.29-10.63-88.12-28.8-45.26-34.63-69.26c-5.83-24-8.23-61.03-6.17-73.03,2.06-12,5.14-22.29,6.86-30.51s9.94-14.74,19.89-16.46c9.94-1.71,17.83,1.37,22.29,4.8,4.46,3.43,11.65,6.28,13.37,10.29.34,1.71-1.37,6.51,8.23,8.23,9.6,1.71,16.05,4.16,16.05,4.16,0,0,15.64,4.29,3.11,7.73-12.69,2.06-20.52-.71-24.29,1.69s-7.21,10.08-9.61,11.1-7.2.34-12,4.11-9.6,6.86-12.69,14.4-5.49,15.77-3.43,26.74,8.57,31.54,14.4,43.2c5.83,11.66,20.23,40.8,24.34,47.66s15.77,29.49,16.8,53.83,1.03,44.23,0,54.86-10.84,51.65-35.53,85.94c-8.16,14.14-23.21,31.9-24.67,35.03-1.45,3.13-3.02,4.88-1.61,7.65,4.62,9.05,12.87,22.13,14.71,29.22,2.29,6.64,6.99,16.13,7.22,28.72Z"
              />
            </svg>
            <span>xavierdamman.com</span>
          </a>
        </div>
      </footer>
    </main>
  );
}
