// Official logos collected from each supplier's own website.
// Files live in /public/logos/suppliers. The frozen pack catalogue is not edited;
// `toDirectorySupplier` attaches these when a supplier has no logo yet.
import logos from "./supplier-official-logos.json";

export type OfficialSupplierLogo = {
  src: string;
  /** White artwork with no coloured file. Painted dark on the white tile. */
  monoOnWhite?: boolean;
};

export const SUPPLIER_OFFICIAL_LOGOS: Record<string, OfficialSupplierLogo> = logos;

export function officialSupplierLogo(id: string | null | undefined): OfficialSupplierLogo | undefined {
  if (!id) return undefined;
  return SUPPLIER_OFFICIAL_LOGOS[id];
}
