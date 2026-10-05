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

  it("renders a bundled logo, and a dark tile for white artwork", () => {
    const chubb = getLogisticsProvider("chubb-worldwide-ocean-cargo")!;
    const chubbHtml = renderToStaticMarkup(<ProviderBadge provider={chubb} />);
    expect(chubbHtml).toContain(`src="${chubb.logo}"`);
    expect(chubbHtml).toContain('alt="Chubb logo"');
    expect(chubbHtml).toContain("bg-white");
    expect(chubbHtml).toContain("object-contain");

    const aig = getLogisticsProvider("aig-ocean-cargo")!;
    const aigHtml = renderToStaticMarkup(<ProviderBadge provider={aig} size="lg" />);
    expect(aigHtml).toContain('src="/logistics/logos/aig-ocean-cargo.png"');
    expect(aigHtml).toContain('alt="AIG logo"');
    expect(aigHtml).toContain("bg-navy");
    expect(aigHtml).toContain("max-width:89px");
    expect(aigHtml).toContain("max-height:89px");
    expect(aigHtml).toContain("object-contain");
  });

  it("keeps a dropped provider on the initials fallback", () => {
    const loadsure = getLogisticsProvider("loadsure")!;
    const html = renderToStaticMarkup(<ProviderBadge provider={loadsure} />);
    expect(html).not.toContain("<img");
    expect(html).toMatch(/>LO</);
  });
});
