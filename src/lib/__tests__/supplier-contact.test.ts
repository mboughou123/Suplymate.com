import { describe, expect, it } from "vitest";
import * as cheerio from "cheerio";
import {
  decodeCfEmail,
  extractContactCandidates,
  findContactPageUrls,
  normalizeEmail,
  normalizePhone,
  pickEmail,
  telHref,
} from "@/lib/scraper/contactExtractor";
import {
  canViewSupplierContact,
  contactViewFor,
  resolveSupplierContact,
  type WebsiteContactFile,
} from "@/lib/supplier-contact";
import { entitlementsFor } from "@/lib/permissions";
import { toDisplaySupplier } from "@/lib/supplier-display";
import { suppliers } from "@/data/suppliers";

describe("contact extractor", () => {
  it("normalises real phone numbers and rejects filler", () => {
    expect(normalizePhone("tel:+86-769-81866898")).toBe("+86-769-81866898");
    expect(normalizePhone("tel:%2B49%2030%20123456")).toBe("+49 30 123456");
    expect(normalizePhone("+1 (214) 689-4300")).toBe("+1 (214) 689-4300");
    expect(normalizePhone("123")).toBeNull();
    expect(normalizePhone("0000000000")).toBeNull();
    expect(normalizePhone("1234567890")).toBeNull();
    expect(normalizePhone("call us today")).toBeNull();
  });

  it("builds dialable tel: hrefs", () => {
    expect(telHref("+91 80828 21432")).toBe("tel:+918082821432");
    expect(telHref("(214) 689-4300")).toBe("tel:2146894300");
  });

  it("drops placeholder and vendor emails", () => {
    expect(normalizeEmail("mailto:Sales@Acme-Steel.com?subject=Hi")).toBe("sales@acme-steel.com");
    expect(normalizeEmail("you@example.com")).toBeNull();
    expect(normalizeEmail("abc123@sentry.wixpress.com")).toBeNull();
    expect(normalizeEmail("logo@2x.png")).toBeNull();
    expect(normalizeEmail("noreply@acme.com")).toBeNull();
  });

  it("decodes Cloudflare-protected emails", () => {
    const key = 0x2a;
    const hex =
      key.toString(16) +
      [..."info@acme.com"].map((c) => (c.charCodeAt(0) ^ key).toString(16).padStart(2, "0")).join("");
    expect(decodeCfEmail(hex)).toBe("info@acme.com");
  });

  it("only takes structured phones and on-domain or explicit freemail addresses", () => {
    const $ = cheerio.load(`
      <html><body>
        <a href="tel:+44 20 7946 0000">Call</a>
        <a href="mailto:owner.acme@gmail.com">Mail</a>
        <p>Write to sales@acme.co.uk or partner@otherco.com. Order ref 4401 2231 9988.</p>
        <p>Built by studio@webagency.io</p>
        <script type="application/ld+json">{"@type":"Organization","telephone":"+44 20 7946 0999","email":"export@acme.co.uk"}</script>
      </body></html>`);
    const { phones, emails } = extractContactCandidates($, "https://www.acme.co.uk/contact");
    expect(phones).toEqual(["+44 20 7946 0000", "+44 20 7946 0999"]);
    expect(emails).toContain("owner.acme@gmail.com");
    expect(emails).toContain("sales@acme.co.uk");
    expect(emails).toContain("export@acme.co.uk");
    expect(emails).not.toContain("partner@otherco.com");
    expect(emails).not.toContain("studio@webagency.io");
  });

  it("prefers a sales mailbox on the supplier's domain and skips non-buyer mailboxes", () => {
    expect(
      pickEmail(["owner@gmail.com", "careers@acme.com", "sales@acme.com"], "https://acme.com"),
    ).toBe("sales@acme.com");
    expect(pickEmail(["hr@acme.com", "privacy@acme.com"], "https://acme.com")).toBeNull();
  });

  it("finds same-site contact pages only", () => {
    const $ = cheerio.load(`
      <a href="/contact-us">Contact</a>
      <a href="https://facebook.com/acme/contact">FB</a>
      <a href="/de/impressum">Impressum</a>
      <a href="/products">Products</a>`);
    expect(findContactPageUrls($, "https://acme.com/")).toEqual([
      "https://acme.com/contact-us",
      "https://acme.com/de/impressum",
    ]);
  });
});

const websiteFile: WebsiteContactFile = {
  generatedAt: "2026-10-04",
  method: "test",
  suppliers: {
    "acme-steel": {
      phone: "+1 555 010 9999",
      email: "sales@acme.com",
      collectedAt: "2026-10-04",
    },
  },
};

describe("resolveSupplierContact", () => {
  it("keeps stored values and fills only the gaps from the website", () => {
    expect(resolveSupplierContact({ id: "acme-steel", phone: "+1 555 010 1234" }, websiteFile)).toEqual({
      phone: "+1 555 010 1234",
      email: "sales@acme.com",
      phoneSource: "listing",
      emailSource: "website",
    });
  });

  it("returns nothing when no real data exists", () => {
    expect(resolveSupplierContact({ id: "unknown", phone: "  ", email: null }, websiteFile)).toEqual({
      phone: null,
      email: null,
      phoneSource: null,
      emailSource: null,
    });
  });
});

describe("plan gating", () => {
  it("is a paid entitlement", () => {
    expect(entitlementsFor("free").directSupplierContact).toBe(false);
    expect(entitlementsFor(null).directSupplierContact).toBe(false);
    for (const plan of ["basic", "premium", "enterprise", "starter", "pro"]) {
      expect(entitlementsFor(plan).directSupplierContact).toBe(true);
    }
  });

  it("requires a signed-in paid viewer", () => {
    expect(canViewSupplierContact({ signedIn: false, plan: "premium" })).toBe(false);
    expect(canViewSupplierContact({ signedIn: true, plan: "free" })).toBe(false);
    expect(canViewSupplierContact({ signedIn: true, plan: "basic" })).toBe(true);
  });

  it("never puts the values in a locked view", () => {
    const supplier = { id: "x", phone: "+91 80828 21432", email: "sales@sarfraz.com" };
    const guest = contactViewFor(supplier, { signedIn: false, plan: null });
    const free = contactViewFor(supplier, { signedIn: true, plan: "free" });
    expect(guest).toEqual({ access: "locked", reason: "guest", hasPhone: true, hasEmail: true });
    expect(free).toEqual({ access: "locked", reason: "plan", hasPhone: true, hasEmail: true });
    expect(JSON.stringify([guest, free])).not.toMatch(/80828|sarfraz/);

    expect(contactViewFor(supplier, { signedIn: true, plan: "basic" })).toMatchObject({
      access: "full",
      phone: "+91 80828 21432",
      email: "sales@sarfraz.com",
    });
  });

  it("keeps contact fields out of the client-facing display supplier", () => {
    const display = toDisplaySupplier({ ...suppliers[0], phone: "+91 80828 21432", email: "a@b.com" });
    expect(display).not.toHaveProperty("phone");
    expect(display).not.toHaveProperty("email");
  });
});
