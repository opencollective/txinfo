"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import React from "react";

const SUPPORTED_CHAINS = [
  { value: "ethereum", label: "Ethereum", shortLabel: "Eth" },
  { value: "polygon", label: "Polygon", shortLabel: "Pol" },
  { value: "base", label: "Base", shortLabel: "Base" },
  { value: "optimism", label: "Optimism", shortLabel: "Op" },
  { value: "arbitrum", label: "Arbitrum", shortLabel: "Arb" },
  { value: "celo", label: "Celo", shortLabel: "Celo" },
];

const TYPES = [
  { value: "tx", label: "Transaction", shortLabel: "Tx" },
  { value: "address", label: "Address", shortLabel: "Addr" },
  { value: "token", label: "Token", shortLabel: "Token" },
];

export default function SearchForm() {
  const router = useRouter();
  const [currentType, setCurrentType] = useState("tx");
  const [currentChain, setCurrentChain] = useState("ethereum");
  const [currentValue, setCurrentValue] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedChain = localStorage.getItem("currentChain");
      if (storedChain) {
        setCurrentChain(storedChain);
      }
    }
  }, [currentChain]);

  // Handle chain selection changes
  const handleChainChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newChain = e.target.value;
    setCurrentChain(newChain);
    localStorage.setItem("currentChain", newChain);
  };

  const detectType = (value: string) => {
    if (!value) return null;
    if (value.trim().endsWith(".eth")) return "address";
    if (value.length === 66 && value.startsWith("0x")) return "tx";
    if (value.length === 42 && value.startsWith("0x")) return "address";
    return null;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const chain = formData.get("chain") as string;
    const type = formData.get("type") as string;
    const value = formData.get("value") as string;

    if (!chain || !type || !value) return;
    router.push(`/${chain}/${type}/${value}`);
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const newType = detectType(value);
    if (newType) {
      setCurrentType(newType);
    }
    setCurrentValue(value);
  };

  const handleGetInfo = () => {
    router.push(`/${currentChain}/${currentType}/${currentValue}`);
  };

  const handleGetTokenInfo = () => {
    router.push(`/${currentChain}/token/${currentValue}`);
  };

  return (
    <form className="space-y-4">
      <div className="flex gap-1 sm:gap-2 flex-wrap sm:flex-nowrap">
        <select
          id="chain-select"
          name="chain"
          className="w-28 sm:w-32 p-2 rounded-md border border-input bg-background"
          value={currentChain}
          onChange={handleChainChange}
        >
          {SUPPORTED_CHAINS.map((chain) => (
            <option key={chain.value} value={chain.value}>
              {chain.label}
            </option>
          ))}
        </select>

        <input
          name="value"
          type="text"
          placeholder="tx hash, address or token address"
          className="flex-1 p-2 rounded-md border border-input bg-background w-full"
          onChange={handleValueChange}
        />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleGetInfo}
          className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 p-2 rounded-md"
        >
          Get {TYPES.find((t) => t.value === currentType)?.label} Info
        </button>

        {currentType === "address" && (
          <button
            type="button"
            onClick={handleGetTokenInfo}
            className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/90 p-2 rounded-md"
          >
            Get Token Info
          </button>
        )}
      </div>
    </form>
  );
}
