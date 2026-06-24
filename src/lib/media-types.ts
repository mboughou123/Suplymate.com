// Pure, dependency-free media types + enums shared by server (media-store) and
// client (admin media UI). No Prisma / Node imports here so it is safe to import
// from client components.

export const MEDIA_TYPES = [
  "SUPPLIER_LOGO",
  "SUPPLIER_COVER",
  "SUPPLIER_FACTORY",
  "SUPPLIER_GALLERY",
  "PRODUCT_PRIMARY",
  "PRODUCT_GALLERY",
  "CERTIFICATION",
  "PROFILE_IMAGE",
  "GENERAL",
] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

export const ENTITY_TYPES = ["SUPPLIER", "PRODUCT", "CERTIFICATION", "USER", "GENERAL"] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export const MEDIA_STATUSES = ["published", "unpublished", "draft"] as const;
export type MediaStatus = (typeof MEDIA_STATUSES)[number];

// Which media types belong to which entity. Used for validation + the UI so a
// logo/factory/cert image is never silently treated as a product image.
export const MEDIA_TYPES_BY_ENTITY: Record<EntityType, MediaType[]> = {
  SUPPLIER: ["SUPPLIER_LOGO", "SUPPLIER_COVER", "SUPPLIER_FACTORY", "SUPPLIER_GALLERY"],
  PRODUCT: ["PRODUCT_PRIMARY", "PRODUCT_GALLERY"],
  CERTIFICATION: ["CERTIFICATION"],
  USER: ["PROFILE_IMAGE"],
  GENERAL: ["GENERAL"],
};

export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  SUPPLIER_LOGO: "Logo",
  SUPPLIER_COVER: "Cover",
  SUPPLIER_FACTORY: "Factory",
  SUPPLIER_GALLERY: "Gallery",
  PRODUCT_PRIMARY: "Primary",
  PRODUCT_GALLERY: "Gallery",
  CERTIFICATION: "Certificate",
  PROFILE_IMAGE: "Profile",
  GENERAL: "General",
};

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  SUPPLIER: "Supplier",
  PRODUCT: "Product",
  CERTIFICATION: "Certification",
  USER: "User",
  GENERAL: "General",
};

export type Media = {
  id: string;
  url: string;
  storageKey: string | null;
  originalUrl: string | null;
  originalFilename: string | null;
  mimeType: string | null;
  fileSize: number | null;
  width: number | null;
  height: number | null;
  mediaType: MediaType;
  entityType: EntityType;
  entityId: string | null;
  altText: string | null;
  caption: string | null;
  sortOrder: number;
  isPrimary: boolean;
  status: MediaStatus;
  uploadedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MediaAuditEntry = {
  id: string;
  adminUser: string | null;
  action: string;
  mediaId: string | null;
  entityType: string | null;
  entityId: string | null;
  detail: string | null;
  createdAt: string;
};

export function isMediaType(v: unknown): v is MediaType {
  return typeof v === "string" && (MEDIA_TYPES as readonly string[]).includes(v);
}
export function isEntityType(v: unknown): v is EntityType {
  return typeof v === "string" && (ENTITY_TYPES as readonly string[]).includes(v);
}
export function isMediaStatus(v: unknown): v is MediaStatus {
  return typeof v === "string" && (MEDIA_STATUSES as readonly string[]).includes(v);
}

/** Aspect-ratio presets for the client image editor. */
export const ASPECT_PRESETS: { key: string; label: string; ratio: number | null }[] = [
  { key: "logo", label: "Logo (1:1)", ratio: 1 },
  { key: "cover", label: "Cover (16:6)", ratio: 16 / 6 },
  { key: "card", label: "Product card (4:3)", ratio: 4 / 3 },
  { key: "document", label: "Certificate (3:4)", ratio: 3 / 4 },
  { key: "original", label: "Original", ratio: null },
];
