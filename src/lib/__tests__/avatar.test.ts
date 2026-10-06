// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  AVATAR_ACCEPT,
  AVATAR_MAX_BYTES,
  isAvatarErrorCode,
  isAvatarMime,
  validateAvatarFile,
} from "@/lib/avatar";

describe("validateAvatarFile", () => {
  it("accepts JPG, PNG, WebP and GIF up to 5 MB", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp", "image/gif"]) {
      expect(validateAvatarFile({ type, size: 1024 })).toBeNull();
    }
    expect(validateAvatarFile({ type: "image/png", size: AVATAR_MAX_BYTES })).toBeNull();
  });

  it("rejects empty and oversized files", () => {
    expect(validateAvatarFile({ type: "image/png", size: 0 })).toBe("avatarEmpty");
    expect(validateAvatarFile({ type: "image/png", size: AVATAR_MAX_BYTES + 1 })).toBe("avatarTooLarge");
  });

  it("rejects unsupported or unknown types", () => {
    expect(validateAvatarFile({ type: "image/svg+xml", size: 10 })).toBe("avatarType");
    expect(validateAvatarFile({ type: "image/avif", size: 10 })).toBe("avatarType");
    expect(validateAvatarFile({ type: "application/pdf", size: 10 })).toBe("avatarType");
    expect(validateAvatarFile({ type: "", size: 10 })).toBe("avatarType");
    expect(validateAvatarFile({ type: null, size: 10 })).toBe("avatarType");
  });
});

describe("avatar helpers", () => {
  it("matches MIME types case-insensitively", () => {
    expect(isAvatarMime("IMAGE/JPEG")).toBe(true);
    expect(isAvatarMime(undefined)).toBe(false);
  });

  it("exposes an accept attribute listing every allowed type", () => {
    expect(AVATAR_ACCEPT).toBe("image/jpeg,image/png,image/webp,image/gif");
  });

  it("recognises API error codes", () => {
    expect(isAvatarErrorCode("avatarStorageUnavailable")).toBe(true);
    expect(isAvatarErrorCode("unauthorized")).toBe(false);
    expect(isAvatarErrorCode(42)).toBe(false);
  });
});
