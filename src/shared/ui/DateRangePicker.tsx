import { useState } from 'react'
import type { DateRange as RdpDateRange } from 'react-day-picker'
import { CalendarBlankIcon } from '@phosphor-icons/react'
import { buttonVariants } from '@/shared/ui/Button'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/Popover'
import { Calendar } from '@/shared/ui/Calendar'
import { isoToDate, dateToISO } from '@/shared/lib/date-range'
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
  const [draft, setDraft] = useState<RdpDateRange | undefined>(undefined)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) setDraft({ from: isoToDate(value.from), to: isoToDate(value.to) })
  }

  function handleSelect(_range: RdpDateRange | undefined, triggerDate: Date) {
    const start = draft?.from
    const complete = Boolean(draft?.from && draft?.to)
    if (!start || complete) {
      setDraft({ from: triggerDate, to: undefined })
      return
    }
    const from = triggerDate < start ? triggerDate : start
    const to = triggerDate < start ? start : triggerDate
    setDraft({ from, to })
    onChange({ from: dateToISO(from), to: dateToISO(to) })
    setOpen(false)
  }

  const selected = draft ?? { from: isoToDate(value.from), to: isoToDate(value.to) }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
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
          numberOfMonths={2}
          defaultMonth={isoToDate(value.from)}
          selected={selected}
          onSelect={handleSelect}
        />
      </PopoverContent>
    </Popover>
  )
}
