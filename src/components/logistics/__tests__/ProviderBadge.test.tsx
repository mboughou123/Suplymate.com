import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { getLogisticsProvider } from "@/data/logistics-providers";
import ProviderBadge from "../ProviderBadge";

describe("ProviderBadge", () => {
  it("shows initials until a logo is published", () => {
    const html = renderToStaticMarkup(<ProviderBadge provider={{ company: "Falvey Insurance Group" }} />);
    expect(html).not.toContain("<img");
    expect(html).toMatch(/>FI</);
  });

  it("shows the published media-library logo", () => {
    const html = renderToStaticMarkup(
      <ProviderBadge provider={{ company: "Falvey Insurance Group" }} logoUrl="https://blob.example/logistics/falvey.png" />,
    );
    expect(html).toContain('src="https://blob.example/logistics/falvey.png"');
    expect(html).toContain('alt="Falvey Insurance Group logo"');
    expect(html).toContain("object-contain");
    expect(html).toContain("bg-white");
  });

  it("renders every logo on a white tile, and paints a white wordmark dark", () => {
    const chubb = getLogisticsProvider("chubb-worldwide-ocean-cargo")!;
    const chubbHtml = renderToStaticMarkup(<ProviderBadge provider={chubb} />);
    expect(chubbHtml).toContain(`src="${chubb.logo}"`);
    expect(chubbHtml).toContain('alt="Chubb logo"');
    expect(chubbHtml).toContain('data-logo-tile="white"');
    expect(chubbHtml).toContain("bg-white");
    expect(chubbHtml).toContain("object-contain");
    expect(chubbHtml).not.toContain("bg-navy");

    const aig = getLogisticsProvider("aig-ocean-cargo")!;
    const aigHtml = renderToStaticMarkup(<ProviderBadge provider={aig} size="lg" />);
    expect(aigHtml).toContain('src="/logistics/logos/aig-ocean-cargo.png"');
    expect(aigHtml).toContain('alt="AIG logo"');
    expect(aigHtml).toContain("bg-white");
    expect(aigHtml).toContain("object-contain");
    expect(aigHtml).not.toContain("bg-navy");
    expect(aigHtml).not.toContain("max-width:89px");

    const qbe = getLogisticsProvider("qbe-marine-cargo")!;
    const qbeHtml = renderToStaticMarkup(<ProviderBadge provider={qbe} />);
    expect(qbeHtml).toContain('data-logo-mono="true"');
    expect(qbeHtml).toContain("brightness-0");
    expect(qbeHtml).toContain("bg-white");
  });

  it("keeps a provider with no official logo on the initials fallback", () => {
    const roanoke = getLogisticsProvider("roanoke-cargo-insurance")!;
    const html = renderToStaticMarkup(<ProviderBadge provider={roanoke} />);
    expect(html).not.toContain("<img");
    expect(html).toMatch(/>RI</);
  });
});
