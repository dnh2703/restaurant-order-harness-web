import type { ComponentProps, ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/shared/lib/cn'

export const badgeVariants = cva('inline-flex items-center gap-2 text-xs', {
  variants: {
    variant: {
      brand: 'bg-brand-bg text-brand',
      outline: 'border border-brand-border bg-brand-bg text-brand',
    },
    size: {
      sm: 'rounded-lg px-2.5 py-1 font-semibold',
      md: 'h-10 rounded-[11px] px-3.5 font-bold',
    },
  },
  defaultVariants: { variant: 'brand', size: 'sm' },
})

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>
export type BadgeSize = NonNullable<VariantProps<typeof badgeVariants>['size']>

interface Props extends ComponentProps<'span'>, VariantProps<typeof badgeVariants> {
  /** Leading status dot. */
  dot?: boolean
  children: ReactNode
}

/** Small pill label (counts, status, table tag). */
export function Badge({ className, variant, size, dot = false, children, ...props }: Props) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && <span className="size-1.5 rounded-full bg-brand" />}
      {children}
    </span>
  )
}
