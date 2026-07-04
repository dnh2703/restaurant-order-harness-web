import { Button } from '@/shared/ui'
import { presetRange, type RangePreset } from '@/shared/lib/date-range'
import type { DateRange } from '@/shared/api/types/reports'

interface Props {
  value: DateRange
  onChange: (range: DateRange) => void
}

const PRESETS: Array<{ id: RangePreset; label: string }> = [
  { id: 'today', label: 'Hôm nay' },
  { id: '7d', label: '7 ngày' },
  { id: '30d', label: '30 ngày' },
]

const inputClass = 'rounded-control border border-line-strong px-2 py-1 text-sm text-ink'

export function DateRangeControl({ value, onChange }: Props) {
  function setFrom(from: string) {
    onChange({ from, to: from > value.to ? from : value.to })
  }
  function setTo(to: string) {
    onChange({ from: to < value.from ? to : value.from, to })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1.5">
        {PRESETS.map((p) => (
          <Button
            key={p.id}
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onChange(presetRange(p.id))}
          >
            {p.label}
          </Button>
        ))}
      </div>
      <label className="flex items-center gap-1.5 text-sm text-muted">
        Từ
        <input
          type="date"
          aria-label="Từ"
          value={value.from}
          onChange={(e) => setFrom(e.target.value)}
          className={inputClass}
        />
      </label>
      <label className="flex items-center gap-1.5 text-sm text-muted">
        Đến
        <input
          type="date"
          aria-label="Đến"
          value={value.to}
          onChange={(e) => setTo(e.target.value)}
          className={inputClass}
        />
      </label>
    </div>
  )
}
