import { describe, expect, it } from "vitest";
import { autoReplyNotice, firstContactNotice } from "@/lib/auto-reply";

const SUPPLIER = "Landefeld Druckluft und Hydraulik";

// These notices are inserted into a buyer's conversation with a real company
// that has no account here. They previously spoke in that company's voice and
// promised quotations, lead times, sample terms and ISO 9001 certification on
// its behalf. The point of these tests is that nobody reintroduces that.
// "we" is fine when it is Suplymate speaking ("we will pass it on"), so these
// target supplier-side commitments and greetings specifically.
const SUPPLIER_VOICE = [
  /\bwe (?:can|could|would) (?:prepare|provide|offer|supply|ship|deliver|send|quote)\b/i,
  /\bwe (?:hold|offer|accept|guarantee)\b/i,
  /\bour (?:team|standard|price|pricing|lead time|MOQ|factory|catalogue)\b/i,
  /thank you for contacting/i,
  /sales representative/i,
  /happy to (?:cover|offer|provide)/i,
];

const FABRICATED_PROMISES = [
  /within 24 hours/i,
  /ISO 9001/i,
  /refundable/i,
  /\d+\s*[-–]\s*\d+\s*(?:business )?days/i,
  /volume discount/i,
  /lead time is/i,
];

const ALL_NOTICES = [
  firstContactNotice(SUPPLIER),
  autoReplyNotice(SUPPLIER, ""),
  autoReplyNotice(SUPPLIER, "What is your price for 500 units?"),
  autoReplyNotice(SUPPLIER, "Can you send samples?"),
  autoReplyNotice(SUPPLIER, "What is your MOQ?"),
  autoReplyNotice(SUPPLIER, "What lead time can you offer?"),
  autoReplyNotice(SUPPLIER, "Are you ISO certified?"),
];

describe("supplier conversation notices", () => {
  it("never writes in the supplier's voice", () => {
    for (const notice of ALL_NOTICES) {
      for (const pattern of SUPPLIER_VOICE) {
        expect(notice, `"${notice}" matched ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it("never promises terms on the supplier's behalf", () => {
    for (const notice of ALL_NOTICES) {
      for (const pattern of FABRICATED_PROMISES) {
        expect(notice, `"${notice}" matched ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it("attributes itself to Suplymate or names the supplier as a third party", () => {
    for (const notice of ALL_NOTICES) {
      expect(notice).toMatch(/Suplymate/);
      expect(notice).toContain(SUPPLIER);
    }
  });

  it("tells the buyer no reply is guaranteed when the thread opens", () => {
    const opener = firstContactNotice(SUPPLIER);
    expect(opener).toMatch(/has not registered/i);
    expect(opener).toMatch(/cannot promise a reply/i);
  });

  it("declines to answer commercial questions instead of inventing an answer", () => {
    expect(autoReplyNotice(SUPPLIER, "What is your MOQ?")).toMatch(
      /do not hold a minimum order quantity/i,
    );
    expect(autoReplyNotice(SUPPLIER, "What is your lead time?")).toMatch(
      /do not hold lead times/i,
    );
    expect(autoReplyNotice(SUPPLIER, "Are you ISO 9001 certified?")).toMatch(
      /holds no certification documents/i,
    );
  });

  it("routes a price question to the quote path without quoting a price", () => {
    const notice = autoReplyNotice(SUPPLIER, "Please quote 500 units");
    expect(notice).toMatch(/quote request is saved/i);
    expect(notice).not.toMatch(/[$€£]\s*\d/);
  });
});
