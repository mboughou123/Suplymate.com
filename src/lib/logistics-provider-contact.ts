// Phone / email for Logistics & Insurance providers, copied from each
// provider's own website. Same paid-plan gate as supplier contact: only
// `contactViewFor` output may leave the server.

import providerContacts from "@/data/logistics-provider-contacts.json";
import { getLogisticsProvider } from "@/data/logistics-providers";
import { contactViewFor, type ContactView, type ContactViewer, type WebsiteContactFile } from "@/lib/supplier-contact";

export const LOGISTICS_PROVIDER_CONTACTS = providerContacts as WebsiteContactFile;

export function logisticsProviderContactView(id: string, viewer: ContactViewer): ContactView | null {
  const provider = getLogisticsProvider(id);
  if (!provider) return null;
  return contactViewFor({ id: provider.id }, viewer, LOGISTICS_PROVIDER_CONTACTS);
}
