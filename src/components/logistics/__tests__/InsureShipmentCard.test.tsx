import type { AnchorHTMLAttributes } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import en from "../../../../messages/en.json";

vi.mock("@/i18n/navigation", () => ({
  Link: (props: AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props} />,
}));

import InsureShipmentCard from "@/components/logistics/InsureShipmentCard";
import { pickShipmentInsurers } from "@/lib/logistics-insurance";

function render(ui: React.ReactElement) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("InsureShipmentCard", () => {
  const lane = { origin: "Germany", destination: "Toronto, Canada", seed: "rfq-9" };

  it("lists the picked insurers with profile and official quote links", () => {
    const html = render(<InsureShipmentCard {...lane} context="rfq" />);
    expect(html).toContain("Insure this shipment");
    for (const p of pickShipmentInsurers(lane)) {
      expect(html).toContain(`href="/logistics/${p.id}"`);
      if (p.quoteUrl) expect(html).toContain(`href="${p.quoteUrl}"`);
    }
    expect(html).toContain("not an insurer or insurance broker");
    expect(html).toContain('rel="noopener noreferrer nofollow"');
    expect(html.toLowerCase()).not.toContain("partner");
  });

  it("lays three insurers out in a row in the wide variant", () => {
    const html = render(<InsureShipmentCard {...lane} variant="wide" />);
    expect(html).toContain("sm:grid-cols-3");
    expect(html.match(/href="\/logistics\//g) ?? []).toHaveLength(3);
  });

  it("has a compact variant with two insurers and the disclaimer", () => {
    const html = render(<InsureShipmentCard {...lane} variant="compact" />);
    const links = html.match(/href="\/logistics\//g) ?? [];
    expect(links).toHaveLength(2);
    expect(html).toContain("not an insurer or insurance broker");
  });
});
