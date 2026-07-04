import { describe, expect, it } from 'vitest'
import { MAX_IMAGE_BYTES, validateImageFile } from './image-upload'

function fileOfType(type: string, size = 1024): File {
  const file = new File(['x'], 'dish.img', { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('validateImageFile', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp'])('accepts %s under the limit', (type) => {
    expect(validateImageFile(fileOfType(type))).toBeNull()
  })

  it('rejects unsupported types', () => {
    expect(validateImageFile(fileOfType('image/gif'))).toBe('Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP')
    expect(validateImageFile(fileOfType('application/pdf'))).toBe(
      'Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP',
    )
  })

  it('rejects files larger than 5 MB', () => {
    expect(validateImageFile(fileOfType('image/png', MAX_IMAGE_BYTES + 1))).toBe(
      'Ảnh vượt quá 5 MB',
    )
  })

  it('accepts a file exactly at the 5 MB limit', () => {
    expect(validateImageFile(fileOfType('image/webp', MAX_IMAGE_BYTES))).toBeNull()
  })
})
