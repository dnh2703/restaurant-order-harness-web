/** Absolute customer URL encoded in a table QR code. */
export function buildTableQrUrl(origin: string, qrToken: string): string {
  const base = origin.replace(/\/$/, '')
  return `${base}/t/${encodeURIComponent(qrToken)}`
}
