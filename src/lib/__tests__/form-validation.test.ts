import { describe, it, expect } from "vitest";
import {
  readString,
  readOptionalString,
  readEmail,
  readChoice,
  isHoneypotTripped,
} from "../form-validation";

function form(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) fd.set(key, value);
  return fd;
}

describe("readEmail", () => {
  it("accepts and normalises a valid address", () => {
    expect(readEmail(form({ email: "  Buyer@Example.COM " }), "email")).toBe(
      "buyer@example.com"
    );
  });

  it.each([
    ["missing @", "buyerexample.com"],
    ["no domain dot", "buyer@example"],
    ["single-char tld", "buyer@example.c"],
    ["internal whitespace", "buy er@example.com"],
    ["empty", ""],
  ])("rejects %s", (_label, value) => {
    expect(readEmail(form({ email: value }), "email")).toBeNull();
  });

  it("rejects an absent field", () => {
    expect(readEmail(form({}), "email")).toBeNull();
  });

  it("rejects an address longer than the 254-char limit", () => {
    const long = `${"a".repeat(250)}@example.com`;
    expect(readEmail(form({ email: long }), "email")).toBeNull();
  });
});

describe("readString", () => {
  it("trims surrounding whitespace", () => {
    expect(readString(form({ name: "  Ada  " }), "name", 50)).toBe("Ada");
  });

  it("rejects whitespace-only input", () => {
    expect(readString(form({ name: "   " }), "name", 50)).toBeNull();
  });

  // Required fields reject overlong input rather than truncating, so a
  // pasted-wrong-field submission surfaces as an error instead of silently
  // storing a fragment.
  it("rejects input over the limit", () => {
    expect(readString(form({ name: "x".repeat(51) }), "name", 50)).toBeNull();
  });
});

describe("readOptionalString", () => {
  it("returns null for blank rather than an empty string", () => {
    expect(readOptionalString(form({ company: "  " }), "company", 50)).toBeNull();
  });

  // Optional fields truncate instead of failing: losing the tail of a nice-to-have
  // value should not block an otherwise valid submission.
  it("truncates instead of rejecting", () => {
    expect(readOptionalString(form({ company: "y".repeat(60) }), "company", 50))
      .toHaveLength(50);
  });
});

describe("readChoice", () => {
  const allowed = ["SUPPORT", "OTHER"] as const;

  it("passes through an allowed value", () => {
    expect(readChoice(form({ topic: "SUPPORT" }), "topic", allowed, "OTHER")).toBe(
      "SUPPORT"
    );
  });

  it("falls back when the value is not allowed", () => {
    expect(readChoice(form({ topic: "ADMIN" }), "topic", allowed, "OTHER")).toBe(
      "OTHER"
    );
  });

  it("falls back when the field is absent", () => {
    expect(readChoice(form({}), "topic", allowed, "OTHER")).toBe("OTHER");
  });
});

describe("isHoneypotTripped", () => {
  it("is not tripped when absent or blank, as for a real visitor", () => {
    expect(isHoneypotTripped(form({}))).toBe(false);
    expect(isHoneypotTripped(form({ website: "   " }))).toBe(false);
  });

  it("is tripped when a bot fills the hidden field", () => {
    expect(isHoneypotTripped(form({ website: "http://spam.example" }))).toBe(true);
  });
});
