export const UPLOADED_IMAGE_PREFIX = "/api/uploads/";

/** Site-relative URL of an image stored in the UploadedImage table. */
export function uploadedImagePath(id: string): string {
  return `${UPLOADED_IMAGE_PREFIX}${id}`;
}

export function isUploadedImagePath(value: string): boolean {
  return value.startsWith(UPLOADED_IMAGE_PREFIX) && /^[a-z0-9]+$/i.test(value.slice(UPLOADED_IMAGE_PREFIX.length));
}
