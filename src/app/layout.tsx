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
  title: "TxInfo",
  description: "Human readable transaction information and other metadata",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="[@media(prefers-color-scheme:dark)]:dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <main className="flex flex-col gap-4 max-w-screen-lg mx-auto p-16">
          <NostrProvider>{children}</NostrProvider>
          <Toaster />
        </main>
      </body>
    </html>
  );
}
