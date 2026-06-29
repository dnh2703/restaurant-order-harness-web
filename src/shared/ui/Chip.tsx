import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/shared/lib/cn'

export const chipVariants = cva(
  'rounded-control px-4 py-2.5 text-sm font-semibold whitespace-nowrap',
  {
    variants: {
      active: {
        true: 'bg-ink text-white',
        false: 'border border-line-strong bg-white text-secondary',
      },
    },
    defaultVariants: { active: false },
  },
)

interface Props extends ComponentProps<'button'>, VariantProps<typeof chipVariants> {}

/** Single-select pill toggle (e.g. category filters). */
export function Chip({ className, active, type = 'button', ...props }: Props) {
  return (
    <button
      data-slot="chip"
      type={type}
      className={cn(chipVariants({ active }), className)}
      {...props}
    />
  )
}
