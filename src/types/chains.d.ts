declare module "@/chains.json" {
  import type { Chain, ChainConfig } from "@/types/index.d.ts";
  const chains: Record<Chain, ChainConfig>;
  export default chains;
}