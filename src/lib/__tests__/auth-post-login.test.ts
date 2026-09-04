import { describe, expect, it } from "vitest";
import {
  normalizeCallbackUrl,
  postAuthAssignHref,
} from "@/lib/auth-post-login";

describe("postAuthAssignHref", () => {
  it("lands signup on the locale dashboard", () => {
    expect(postAuthAssignHref("fr")).toBe("/fr/dashboard");
    expect(postAuthAssignHref("en")).toBe("/en/dashboard");
  });

  it("defaults a blank locale to en", () => {
    expect(postAuthAssignHref("")).toBe("/en/dashboard");
    expect(postAuthAssignHref("   ")).toBe("/en/dashboard");
  });

  it("joins a locale-stripped login callback", () => {
    expect(postAuthAssignHref("ar", "/rfqs")).toBe("/ar/rfqs");
  });
});

describe("normalizeCallbackUrl", () => {
  it("defaults empty and auth pages to /dashboard", () => {
    expect(normalizeCallbackUrl(null)).toBe("/dashboard");
    expect(normalizeCallbackUrl("/signup")).toBe("/dashboard");
    expect(normalizeCallbackUrl("/en/login")).toBe("/dashboard");
    expect(normalizeCallbackUrl("/forgot-password")).toBe("/dashboard");
  });

  it("rejects absolute URLs", () => {
    expect(normalizeCallbackUrl("https://evil.example/phish")).toBe(
      "/dashboard",
    );
  });

  it("keeps on-site destinations locale-stripped", () => {
    expect(normalizeCallbackUrl("/en/dashboard")).toBe("/dashboard");
    expect(normalizeCallbackUrl("/fr/settings")).toBe("/settings");
  });
});
