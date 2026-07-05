import { Button, DateRangePicker } from '@/shared/ui'
import { presetRange, matchPreset, type RangePreset } from '@/shared/lib/date-range'
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

export function DateRangeControl({ value, onChange }: Props) {
  const active = matchPreset(value)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1.5">
        {PRESETS.map((p) => (
          <Button
            key={p.id}
            type="button"
            variant={active === p.id ? 'primary' : 'secondary'}
            size="sm"
            aria-pressed={active === p.id}
            onClick={() => onChange(presetRange(p.id))}
          >
            {p.label}
          </Button>
        ))}
      </div>
      <DateRangePicker value={value} onChange={onChange} />
    </div>
  )
}
