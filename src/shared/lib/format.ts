/** Coerce API money fields (sometimes serialized as integer-strings) to a number. */
export function toNumber(value: unknown): number {
  if (typeof value === 'number') return value
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? n : 0
}

/** Format a VND amount (stored as an integer) for display. */
export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)
}
