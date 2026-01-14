import { describe, test, expect } from "@jest/globals";
import { generateURI } from "./utils";
import { ChainNamespace } from "@/utils/rpcProvider";

describe("generateURI", () => {
  test("generates an eip155 address URI and lowercases it", () => {
    const uri = generateURI("eip155", { chainId: 1, address: "0xAbC123" });
    expect(uri).toBe("eip155:1:address:0xabc123");
  });

  test("generates an eip155 tx URI and lowercases it", () => {
    const uri = generateURI("eip155", { chainId: 1, txId: "0xDEAD" });
    expect(uri).toBe("eip155:1:tx:0xdead");
  });

  test("generates a stacks address URI and lowercases it", () => {
    const uri = generateURI("stacks", { chainId: 2, address: "SP1ABC" });
    expect(uri).toBe("stacks:2:address:sp1abc");
  });

  test("throws for missing address/txId parameters", () => {
    expect(() => generateURI("eip155", { chainId: 1 })).toThrow();
  });

   test("throws for missing address/txId parameters", () => {
    const uri = generateURI("ethereum" as ChainNamespace, { chainId: 1, address: "0xAbC123" });
    expect(uri).toBe("ethereum");
  });
});