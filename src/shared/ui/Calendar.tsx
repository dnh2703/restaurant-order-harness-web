import type { ComponentProps } from 'react'
import { DayPicker } from 'react-day-picker'
import type { ChevronProps } from 'react-day-picker'
import { vi } from 'react-day-picker/locale'
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react'
import { buttonVariants } from '@/shared/ui/Button'
import { cn } from '@/shared/lib/cn'

function CalendarChevron({ orientation, ...rest }: ChevronProps) {
  return orientation === 'left' ? (
    <CaretLeftIcon size={16} weight="bold" {...rest} />
  ) : (
    <CaretRightIcon size={16} weight="bold" {...rest} />
  )
}

/** shadcn-style calendar over react-day-picker, styled with project tokens (Vietnamese). */
export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      locale={vi}
      showOutsideDays={showOutsideDays}
      className={cn('p-1', className)}
      classNames={{
        months: 'flex flex-col gap-4 sm:flex-row',
        month: 'flex flex-col gap-3',
        month_caption: 'relative flex h-8 items-center justify-center',
        caption_label: 'text-sm font-bold capitalize text-ink',
        nav: 'absolute inset-x-0 top-0 flex items-center justify-between',
        button_previous: cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'size-8 p-0'),
        button_next: cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'size-8 p-0'),
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'w-9 text-xs font-normal text-muted',
        week: 'mt-1 flex w-full',
        day: 'relative h-9 w-9 p-0 text-center text-sm',
        day_button: 'size-9 rounded-control font-normal text-ink hover:bg-page',
        range_start: 'rounded-l-control bg-brand text-white',
        range_end: 'rounded-r-control bg-brand text-white',
        range_middle: 'rounded-none bg-brand-bg text-brand',
        selected: 'bg-brand text-white',
        today: 'font-bold text-brand',
        outside: 'text-muted opacity-50',
        disabled: 'opacity-30',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: CalendarChevron,
      }}
      {...props}
    />
  )
}
