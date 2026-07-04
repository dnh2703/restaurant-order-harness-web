/** Client-side image upload constraints, mirroring the backend (US-021). */

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

/** `accept` attribute value for the file `<input>`. */
export const IMAGE_ACCEPT_ATTR = ACCEPTED_IMAGE_TYPES.join(',')

/**
 * Validate a picked file against the same rules the server enforces, so we can reject
 * bad files before uploading. Returns a Vietnamese error message, or `null` when valid.
 */
export function validateImageFile(file: File): string | null {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return 'Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP'
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return 'Ảnh vượt quá 5 MB'
  }
  return null
}
