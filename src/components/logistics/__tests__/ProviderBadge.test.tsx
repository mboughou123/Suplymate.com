import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ProviderBadge from "../ProviderBadge";

describe("ProviderBadge", () => {
  it("shows initials until a logo is published", () => {
    const html = renderToStaticMarkup(<ProviderBadge provider={{ company: "Falvey Insurance Group" }} />);
    expect(html).not.toContain("<img");
    expect(html).toMatch(/>FI</);
  });

  it("shows the published media-library logo", () => {
    const html = renderToStaticMarkup(<ProviderBadge provider={{ company: "Falvey Insurance Group" }} logoUrl="https://blob.example/logistics/falvey.png" />);
    expect(html).toContain('src="https://blob.example/logistics/falvey.png"');
    expect(html).toContain('alt=""');
  });
});
