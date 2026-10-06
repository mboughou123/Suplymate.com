import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import LogoTile from "@/components/LogoTile";
import AiIllustrationBadge from "@/components/AiIllustrationBadge";
import ProductGallery from "@/components/product/ProductGallery";
import { AI_GENERATED_LABEL, ALIBABA_PHOTO_CAPTION } from "@/lib/image-attribution";
import type { GalleryImage } from "@/lib/product-detail";

vi.mock("next/image", () => ({
  default: (props: { alt?: string; src?: string }) => <img alt={props.alt} src={props.src} />,
}));

const slide = (over: Partial<GalleryImage>): GalleryImage => ({
  id: "slide",
  label: "Coil",
  gradient: "none",
  icon: "package",
  isVideo: false,
  url: "/images/products/coil.jpg",
  ...over,
});

describe("white logo tiles", () => {
  it("puts a logo and the initials fallback on the same white tile", () => {
    const logo = renderToStaticMarkup(<LogoTile src="/logistics/logos/chubb-worldwide-ocean-cargo.png" alt="Chubb logo" className="h-12 w-12" />);
    expect(logo).toContain('data-logo-tile="white"');
    expect(logo).toContain("bg-white");
    expect(logo).toContain("object-contain");
    expect(logo).toContain("border-slate-200");
    expect(logo).not.toContain("bg-navy");

    const qbe = renderToStaticMarkup(<LogoTile src="/logistics/logos/qbe-marine-cargo.svg" alt="QBE logo" />);
    expect(qbe).toContain('data-logo-mono="true"');
    expect(qbe).toContain("brightness-0");
    expect(qbe).toContain("bg-white");

    const initials = renderToStaticMarkup(<LogoTile alt="No logo" initials="NS" />);
    expect(initials).toContain('data-logo-tile="white"');
    expect(initials).toContain("bg-white");
    expect(initials).toContain(">NS<");
    expect(initials).not.toContain("<img");
  });
});

describe("AI illustration badge", () => {
  it("labels the badge and the product-gallery alt, and captions an Alibaba photo", () => {
    expect(renderToStaticMarkup(<AiIllustrationBadge />)).toContain(AI_GENERATED_LABEL);

    const ai = renderToStaticMarkup(
      <ProductGallery
        images={[
          slide({
            id: "ai",
            aiGenerated: true,
            alt: `Hot-rolled coil — ${AI_GENERATED_LABEL}`,
            label: `Hot-rolled coil — ${AI_GENERATED_LABEL}`,
          }),
        ]}
      />,
    );
    expect(ai).toContain(AI_GENERATED_LABEL);
    expect(ai).toContain(`alt="Hot-rolled coil — ${AI_GENERATED_LABEL}"`);

    const store = renderToStaticMarkup(
      <ProductGallery images={[slide({ id: "ali", photoSource: "alibaba-store", label: "Store photo" })]} />,
    );
    expect(store).toContain("Photo: supplier&#x27;s Alibaba store");
    expect(ALIBABA_PHOTO_CAPTION).toBe("Photo: supplier's Alibaba store");
  });
});
