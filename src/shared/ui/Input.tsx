import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

interface Props extends ComponentProps<'input'> {
  /** Optional decorative icon rendered before the input (aria-hidden). */
  leadingIcon?: ReactNode
  /** Extra classes for the filled container (e.g. width/height). */
  containerClassName?: string
}

/** Filled text input with an optional leading icon. No variants — cn + data-slot. */
export function Input({ leadingIcon, containerClassName, className, ...props }: Props) {
  return (
    <label
      data-slot="input-wrapper"
      className={cn('flex items-center gap-2 rounded-control bg-page px-3.5', containerClassName)}
    >
      {leadingIcon != null && (
        <span aria-hidden className="text-muted">
          {leadingIcon}
        </span>
      )}
      <input
        data-slot="input"
        className={cn(
          'w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted',
          className,
        )}
        {...props}
      />
    </label>
  )
}
