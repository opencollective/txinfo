import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-16 sm:py-24">
        <div className="text-center">
          <h1 className="text-4xl sm:text-6xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 text-transparent bg-clip-text mb-6">
            TxInfo.xyz
          </h1>

          <p className="text-xl sm:text-2xl text-gray-600 mb-12">
            Add metadata to any blockchain transaction using Nostr
          </p>

          <div className="grid gap-8 md:grid-cols-2 mb-16">
            <div className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-xl font-semibold mb-3 text-violet-700">
                🔍 Find Information
              </h2>
              <p className="text-gray-600">
                Search and discover metadata about any transaction across
                multiple blockchains
              </p>
            </div>

            <div className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-xl font-semibold mb-3 text-violet-700">
                ✍️ Add Context
              </h2>
              <p className="text-gray-600">
                Contribute by adding descriptions, tags, and links to
                transactions
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <Link
              href="/profile"
              className="inline-block px-8 py-3 bg-violet-600 text-white font-semibold rounded-lg hover:bg-violet-700 transition-colors"
            >
              Get Started
            </Link>

            <p className="text-sm text-gray-500">
              Powered by{" "}
              <a
                href="https://nostr.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-600 hover:text-violet-700 underline"
              >
                Nostr
              </a>
            </p>
          </div>
        </div>

        <div className="mt-24">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
            How It Works
          </h2>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="text-center p-4">
              <div className="text-3xl mb-2">🔗</div>
              <h3 className="font-medium mb-2">Connect</h3>
              <p className="text-gray-600 text-sm">
                Sign in with your Nostr key or extension
              </p>
            </div>

            <div className="text-center p-4">
              <div className="text-3xl mb-2">📝</div>
              <h3 className="font-medium mb-2">Add Info</h3>
              <p className="text-gray-600 text-sm">
                Write descriptions and add metadata to any transaction
              </p>
            </div>

            <div className="text-center p-4">
              <div className="text-3xl mb-2">🌐</div>
              <h3 className="font-medium mb-2">Share</h3>
              <p className="text-gray-600 text-sm">
                Help others understand blockchain transactions better
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
