import { localeRedirect } from "@/i18n/redirect";

// Price charts now live at /materials (catalog materials with provenance).
export default async function PriceChartsPage() {
  return await localeRedirect("/materials");
}
