import { describe, expect, it } from "vitest";
import { isAuthorizedCron } from "@/lib/import/cron-auth";

const req = (auth?: string) =>
  new Request("https://suplymate.com/api/cron/daily-import", { headers: auth ? { authorization: auth } : {} });

describe("isAuthorizedCron", () => {
  it("accepts only the exact Vercel bearer token", () => {
    expect(isAuthorizedCron(req("Bearer s3cret"), "s3cret")).toBe(true);
    expect(isAuthorizedCron(req("bearer s3cret"), "s3cret")).toBe(true);
    expect(isAuthorizedCron(req("Bearer nope"), "s3cret")).toBe(false);
    expect(isAuthorizedCron(req("Basic s3cret"), "s3cret")).toBe(false);
    expect(isAuthorizedCron(req(), "s3cret")).toBe(false);
  });

  it("refuses everything when CRON_SECRET is not configured", () => {
    expect(isAuthorizedCron(req("Bearer anything"), undefined)).toBe(false);
    expect(isAuthorizedCron(req("Bearer "), "")).toBe(false);
  });
});
