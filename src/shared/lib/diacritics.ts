/** Lowercase, strip Vietnamese diacritics, map đ→d for accent-insensitive search. */
export function normalizeVN(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim()
}

/** True when `query` (normalized) is empty or a substring of `haystack` (normalized). */
export function matchesQuery(haystack: string, query: string): boolean {
  const q = normalizeVN(query)
  if (q === '') return true
  return normalizeVN(haystack).includes(q)
}
