export type SupplierMeta = {
  /** Presence and reply-time figures are not sourced, so they are omitted. */
  verified: false;
};

export function getSupplierMeta(_idOrName: string): SupplierMeta {
  return { verified: false };
}
