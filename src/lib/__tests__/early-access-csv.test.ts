import { describe, expect, it } from "vitest";
import { signupsToCsv } from "@/lib/early-access-csv";

describe("signupsToCsv", () => {
  it("writes UTM columns and neutralizes spreadsheet formulas", () => {
    const csv = signupsToCsv([
      {
        email: "buyer@acme-steel.com",
        name: "=cmd",
        company: "Acme",
        role: "procurement",
        categories: JSON.stringify(["Steel & Metals", "Tubes & Pipes"]),
        note: 'Says "hello"',
        utmSource: "linkedin",
        utmMedium: "social",
        utmCampaign: "prelaunch",
        utmContent: "post-1",
        referrer: "https://www.linkedin.com/",
        landingPath: "/en/early-access",
        locale: "en",
        createdAt: new Date("2026-10-28T00:00:00.000Z"),
      },
    ]);
    expect(csv.split("\n")[0]).toBe(
      "email,name,company,role,categories,note,utm_source,utm_medium,utm_campaign,utm_content,referrer,landing_path,locale,created_at",
    );
    expect(csv).toContain("'=cmd");
    expect(csv).toContain('"Says ""hello"""');
    expect(csv).toContain("linkedin,social,prelaunch,post-1");
    expect(csv).toContain("Steel & Metals; Tubes & Pipes");
  });
});