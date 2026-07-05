import { useState } from 'react'
import type { DateRange as RdpDateRange } from 'react-day-picker'
import { CalendarBlankIcon } from '@phosphor-icons/react'
import { buttonVariants } from '@/shared/ui/Button'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/Popover'
import { Calendar } from '@/shared/ui/Calendar'
import { isoToDate, rdpRangeToIso } from '@/shared/lib/date-range'
import { cn } from '@/shared/lib/cn'
import type { DateRange } from '@/shared/api/types/reports'

const dateFmt = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

/** Vietnamese label for a range: one date if from===to, else "from – to". */
export function formatRangeLabel(value: DateRange): string {
  const from = dateFmt.format(isoToDate(value.from))
  if (value.from === value.to) return from
  return `${from} – ${dateFmt.format(isoToDate(value.to))}`
}

interface Props {
  value: DateRange
  onChange: (range: DateRange) => void
  className?: string
}

export function DateRangePicker({ value, onChange, className }: Props) {
  const [open, setOpen] = useState(false)

  function handleSelect(range: RdpDateRange | undefined) {
    const iso = rdpRangeToIso(range)
    if (iso) {
      onChange(iso)
      setOpen(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          buttonVariants({ variant: 'secondary', size: 'sm' }),
          'inline-flex items-center gap-1.5',
          className,
        )}
      >
        <CalendarBlankIcon size={16} weight="bold" />
        {formatRangeLabel(value)}
      </PopoverTrigger>
      <PopoverContent align="end">
        <Calendar
          mode="range"
          numberOfMonths={1}
          defaultMonth={isoToDate(value.from)}
          selected={{ from: isoToDate(value.from), to: isoToDate(value.to) }}
          onSelect={handleSelect}
        />
      </PopoverContent>
    </Popover>
  )
}
