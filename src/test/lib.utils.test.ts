import { describe, test, expect } from "@jest/globals";
import { extractHashtags } from "../lib/utils";

describe("extractHashtags", () => {
  test("should return empty tags array and original text for string without hashtags", () => {
    const text = "This is a simple text without any hashtags";
    const result = extractHashtags(text);
    expect(result.tags).toEqual([]);
    expect(result.cleanDescription).toBe(text);
  });

  test("should extract simple hashtags", () => {
    const text = "Hello #world #javascript #testing";
    const result = extractHashtags(text);
    expect(result.tags).toEqual(["world", "javascript", "testing"]);
    expect(result.cleanDescription).toBe("Hello");
  });

  test("should extract key:value hashtags", () => {
    const text = "Invoice #invoiceId:1234 for #amount:150.50";
    const result = extractHashtags(text);
    expect(result.tags).toEqual(["invoiceId:1234", "amount:150.50"]);
    expect(result.cleanDescription).toBe("Invoice for");
  });

  test("should handle mixed simple and key:value hashtags", () => {
    const text = "Payment #pending for #invoiceId:1294 #urgent";
    const result = extractHashtags(text);
    expect(result.tags).toEqual(["pending", "invoiceId:1294", "urgent"]);
    expect(result.cleanDescription).toBe("Payment for");
  });

  test("should handle hashtags with numbers", () => {
    const text = "#tag123 #version2 #3d";
    const result = extractHashtags(text);
    expect(result.tags).toEqual(["tag123", "version2", "3d"]);
    expect(result.cleanDescription).toBe("");
  });

  test("should handle consecutive hashtags", () => {
    const text = "#first#second#third";
    const result = extractHashtags(text);
    expect(result.tags).toEqual(["first", "second", "third"]);
    expect(result.cleanDescription).toBe("");
  });

  test("should handle hashtags with decimal numbers", () => {
    const text =
      "Price #amount:10.5 #url:https://x.com/mbauwens/status/1907032925847343541";
    const result = extractHashtags(text);
    expect(result.tags).toEqual([
      "amount:10.5",
      "url:https://x.com/mbauwens/status/1907032925847343541",
    ]);
    expect(result.cleanDescription).toBe("Price");
  });

  test("should preserve spacing in clean description", () => {
    const text = "This is a #tagged message with #multiple hashtags in between";
    const result = extractHashtags(text);
    expect(result.tags).toEqual(["tagged", "multiple"]);
    expect(result.cleanDescription).toBe(
      "This is a message with hashtags in between"
    );
  });

  test("should handle empty string", () => {
    const text = "";
    const result = extractHashtags(text);
    expect(result.tags).toEqual([]);
    expect(result.cleanDescription).toBe("");
  });

  test("should handle string with only hashtags", () => {
    const text = "#one #two #three";
    const result = extractHashtags(text);
    expect(result.tags).toEqual(["one", "two", "three"]);
    expect(result.cleanDescription).toBe("");
  });
});
