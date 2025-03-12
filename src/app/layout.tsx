import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NostrProvider } from "@/providers/NostrProvider";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TxInfo - Add metadata to any blockchain transaction",
  description: "Add metadata to any blockchain transaction using Nostr",
  openGraph: {
    title: "TxInfo - Add metadata to any blockchain transaction",
    description: "Add metadata to any blockchain transaction using Nostr",
    url: "https://txinfo.xyz",
    siteName: "TxInfo",
    images: [
      {
        url: "https://txinfo.xyz/txinfo-light.png", // 1200x630px recommended
        width: 1200,
        height: 630,
        alt: "TxInfo - Add metadata to any blockchain transaction",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TxInfo - Add metadata to any blockchain transaction",
    description: "Add metadata to any blockchain transaction using Nostr",
    creator: "@xdamman",
    images: ["https://txinfo.xyz/txinfo-light.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="[@media(prefers-color-scheme:dark)]:dark">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <main className="flex flex-col gap-4 max-w-screen-lg mx-auto p-4 md:p-16">
          <NostrProvider>{children}</NostrProvider>
          <Toaster />
        </main>
      </body>
    </html>
  );
}
