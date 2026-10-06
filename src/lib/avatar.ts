export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_MAX_EDGE = 512;
export const AVATAR_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export const AVATAR_ACCEPT = AVATAR_MIME_TYPES.join(",");

export type AvatarMime = (typeof AVATAR_MIME_TYPES)[number];

export type AvatarFileError = "avatarEmpty" | "avatarTooLarge" | "avatarType";

export type AvatarErrorCode =
  | AvatarFileError
  | "avatarRateLimited"
  | "avatarStorageUnavailable"
  | "avatarUploadFailed"
  | "avatarRemoveFailed";

export function isAvatarMime(value: string | null | undefined): value is AvatarMime {
  return (AVATAR_MIME_TYPES as readonly string[]).includes((value ?? "").toLowerCase());
}

/** Client- and server-side pre-check of an avatar file's declared type and size. */
export function validateAvatarFile(file: { type: string | null; size: number }): AvatarFileError | null {
  if (file.size <= 0) return "avatarEmpty";
  if (file.size > AVATAR_MAX_BYTES) return "avatarTooLarge";
  if (!isAvatarMime(file.type)) return "avatarType";
  return null;
}

export function isAvatarErrorCode(value: unknown): value is AvatarErrorCode {
  switch (value) {
    case "avatarEmpty":
    case "avatarTooLarge":
    case "avatarType":
    case "avatarRateLimited":
    case "avatarStorageUnavailable":
    case "avatarUploadFailed":
    case "avatarRemoveFailed":
      return true;
    default:
      return false;
  }
}
