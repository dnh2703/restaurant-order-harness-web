import type { DateRange } from '@/shared/api/types/reports'

function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** ISO YYYY-MM-DD -> local-midnight Date. */
export function isoToDate(iso: string): Date {
  const parts = iso.split('-')
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
}

/** Local Date -> ISO YYYY-MM-DD. */
export function dateToISO(d: Date): string {
  return toISODate(d)
}

/** Today in local time as YYYY-MM-DD. */
export function todayISO(): string {
  return toISODate(new Date())
}

/** Shift an ISO date (YYYY-MM-DD) by n days (may be negative). */
export function addDays(iso: string, n: number): string {
  const parts = iso.split('-')
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
  date.setDate(date.getDate() + n)
  return toISODate(date)
}

/** Inclusive list of YYYY-MM-DD from `from` to `to`. Empty when from > to. */
export function eachDayInclusive(from: string, to: string): string[] {
  if (from > to) return []
  const out: string[] = []
  let cur = from
  while (cur <= to) {
    out.push(cur)
    cur = addDays(cur, 1)
  }
  return out
}

export type RangePreset = 'today' | '7d' | '30d'

/** Compute a date range for a preset, ending today. */
export function presetRange(preset: RangePreset): DateRange {
  const to = todayISO()
  const spanDays = preset === 'today' ? 0 : preset === '7d' ? 6 : 29
  return { from: addDays(to, -spanDays), to }
}

/** Which preset (if any) the given range exactly equals; null for a custom range. */
export function matchPreset(value: DateRange): RangePreset | null {
  const presets: RangePreset[] = ['today', '7d', '30d']
  for (const p of presets) {
    const r = presetRange(p)
    if (r.from === value.from && r.to === value.to) return p
  }
  return null
}

/** react-day-picker Date range -> ISO DateRange; null unless both ends are set. */
export function rdpRangeToIso(range: { from?: Date; to?: Date } | undefined): DateRange | null {
  if (range?.from && range?.to) return { from: dateToISO(range.from), to: dateToISO(range.to) }
  return null
}
