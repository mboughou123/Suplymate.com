/**
 * White logo tile used on every logo surface.
 * White-only artwork that has no coloured file is painted dark so it stays visible.
 */
import { SUPPLIER_OFFICIAL_LOGOS } from "@/data/supplier-official-logos";

export const LOGO_TILE_CLASS =
  "flex shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-white p-1.5";
export const LOGO_IMAGE_CLASS = "h-full w-full object-contain";
/** Turns white artwork into a dark mono mark on the white tile. */
export const LOGO_MONO_CLASS = "brightness-0";
export const LOGO_INITIALS_CLASS = "font-extrabold tracking-tight text-navy";

/**
 * Logos whose official site has no coloured/dark file. The white artwork is
 * kept and drawn with {@link LOGO_MONO_CLASS}.
 * QBE European Operations publishes only a white wordmark (`QBE_logo_colour-02.svg`
 * on qbeeurope.com is the same file). Supplier ids come from
 * `supplier-official-logos.json` when that file is the only mark on the site.
 */
const SUPPLIER_MONO_IDS = Object.entries(SUPPLIER_OFFICIAL_LOGOS)
  .filter(([, logo]) => logo.monoOnWhite)
  .map(([id]) => id);

/** QBE plus supplier marks that exist only as white artwork. */
export const MONO_ON_WHITE_LOGO_IDS: readonly string[] = ["qbe-marine-cargo", ...SUPPLIER_MONO_IDS];

const MONO_IDS = new Set<string>(MONO_ON_WHITE_LOGO_IDS);

export function logoNeedsMono(src: string | null | undefined): boolean {
  if (!src) return false;
  const path = src.split("?")[0].split("#")[0];
  const file = path.split("/").pop() ?? "";
  const id = file.replace(/\.(png|svg|webp|jpe?g)$/i, "");
  return MONO_IDS.has(id) || MONO_IDS.has(path);
}
