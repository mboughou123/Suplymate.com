// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  confirmationMessage,
  deliverAlertMessage,
  directionFor,
  isTriggered,
  normalizeContact,
} from "@/lib/price-alerts";
import { normalizePhone } from "@/lib/sms";

const steel = { id: "steel", name: "Steel", currentPrice: 650, unit: "USD/ton" };

describe("normalizePhone", () => {
  it("accepts international numbers with formatting", () => {
    expect(normalizePhone("+212 6 12-34 56 78")).toBe("+212612345678");
    expect(normalizePhone("00 44 (20) 7946 0958")).toBe("+442079460958");
  });

  it("rejects numbers without a country code or with letters", () => {
    expect(normalizePhone("0612345678")).toBeNull();
    expect(normalizePhone("+1 call me")).toBeNull();
    expect(normalizePhone("+12")).toBeNull();
  });
});

describe("normalizeContact", () => {
  it("validates per channel", () => {
    expect(normalizeContact("Email", " Buyer@Example.com ")).toBe("buyer@example.com");
    expect(normalizeContact("Email", "not-an-email")).toBeNull();
    expect(normalizeContact("SMS", "+1 415 555 0123")).toBe("+14155550123");
    expect(normalizeContact("SMS", "")).toBeNull();
  });
});

describe("direction and trigger", () => {
  it("fires below-targets when the price drops to them", () => {
    expect(directionFor(650, 600)).toBe("below");
    expect(isTriggered("below", 620, 600)).toBe(false);
    expect(isTriggered("below", 600, 600)).toBe(true);
  });

  it("fires above-targets when the price rises to them", () => {
    expect(directionFor(650, 700)).toBe("above");
    expect(isTriggered("above", 690, 700)).toBe(false);
    expect(isTriggered("above", 705, 700)).toBe(true);
  });
});

describe("deliverAlertMessage", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: "x", sid: "SM1" }), { status: 200 }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    fetchMock.mockReset();
  });

  it("sends SMS through Twilio with the normalised number", async () => {
    vi.stubEnv("TWILIO_ACCOUNT_SID", "AC123");
    vi.stubEnv("TWILIO_AUTH_TOKEN", "secret");
    vi.stubEnv("TWILIO_FROM_NUMBER", "+15005550006");

    const res = await deliverAlertMessage("SMS", "+212612345678", confirmationMessage(steel, 600, "below"));

    expect(res).toEqual({ sent: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.twilio.com/2010-04-01/Accounts/AC123/Messages.json");
    const body = new URLSearchParams(init.body as string);
    expect(body.get("To")).toBe("+212612345678");
    expect(body.get("From")).toBe("+15005550006");
    expect(body.get("Body")).toContain("Steel drops to 600 USD/ton");
  });

  it("sends email through Resend", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");

    const res = await deliverAlertMessage("Email", "buyer@example.com", confirmationMessage(steel, 700, "above"));

    expect(res).toEqual({ sent: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    const payload = JSON.parse(init.body as string);
    expect(payload.to).toEqual(["buyer@example.com"]);
    expect(payload.text).toContain("Steel rises to 700 USD/ton");
  });

  it("reports not_configured without calling a provider", async () => {
    vi.stubEnv("TWILIO_ACCOUNT_SID", "");
    const res = await deliverAlertMessage("SMS", "+212612345678", confirmationMessage(steel, 600, "below"));
    expect(res).toEqual({ sent: false, reason: "not_configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
