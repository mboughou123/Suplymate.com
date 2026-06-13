// Deterministic supplier presence/trust metadata derived from the supplier id.
// (Until suppliers have real accounts, this gives stable, believable values.)

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export type SupplierMeta = {
  online: boolean;
  responseTime: string;
  responseRate: number;
  lastActive: string;
  verified: boolean;
  deliveryReliability: number;
};

export function getSupplierMeta(idOrName: string): SupplierMeta {
  const seed = hashString(idOrName || "supplier");
  const online = seed % 3 !== 0;
  const lastActiveMin = (seed % 58) + 1;
  return {
    online,
    responseTime: `≤${[1, 2, 3, 4, 6][seed % 5]}h`,
    responseRate: 82 + (seed % 18),
    lastActive: online
      ? "Active now"
      : lastActiveMin < 60
        ? `Active ${lastActiveMin}m ago`
        : `Active ${Math.floor(lastActiveMin / 60)}h ago`,
    verified: seed % 4 !== 0,
    deliveryReliability: 88 + (seed % 12),
  };
}
