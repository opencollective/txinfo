import { describe, test, expect } from "@jest/globals";
import { decomposeURI } from "./utils";

describe("decomposeURI", () => {
  test("parses an eip155 address URI", () => {
    const res = decomposeURI("eip155:1:address:0xAbC123");
    expect(res).toEqual({
      chainNamespace: "eip155",
      addressType: "address",
      chainId: 1,
      address: "0xAbC123",
    });
  });

  test("parses a stacks tx URI", () => {
    const res = decomposeURI("stacks:2:tx:SP1XYZ");
    expect(res).toEqual({
      chainNamespace: "stacks",
      addressType: "tx",
      chainId: 2,
      txId: "SP1XYZ",
    });
  });

  test("accepts bip122 but returns NaN for non-numeric chain id", () => {
    const res = decomposeURI(
      "bip122:abc:tx:abcd1234"
    );
    expect(res.chainNamespace).toBe("bip122");
    expect(res.addressType).toBe("tx");
    // chainId is parsed with parseInt -> not a valid number for this format
    expect(typeof res.chainId).toBe("number");
    expect(Number.isNaN(res.chainId)).toBe(true);
    expect(res.txId).toBe("abcd1234");
  });

  test("throws for unknown namespace", () => {
    expect(() => decomposeURI("unknown:1:address:foo")).toThrow(
      /blockchain name space unknown/i
    );
  });
});