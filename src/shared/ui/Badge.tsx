import type { ReactNode } from 'react'

export type BadgeVariant = 'brand' | 'outline'
export type BadgeSize = 'sm' | 'md'

const variants: Record<BadgeVariant, string> = {
  brand: 'bg-brand-bg text-brand',
  outline: 'border border-brand-border bg-brand-bg text-brand',
}

const sizes: Record<BadgeSize, string> = {
  sm: 'rounded-lg px-2.5 py-1 font-semibold',
  md: 'h-10 rounded-[11px] px-3.5 font-bold',
}

interface Props {
  variant?: BadgeVariant
  size?: BadgeSize
  /** Leading status dot. */
  dot?: boolean
  className?: string
  children: ReactNode
}

/** Small pill label (counts, status, table tag). */
export function Badge({
  variant = 'brand',
  size = 'sm',
  dot = false,
  className = '',
  children,
}: Props) {
  return (
    <span
      className={[
        'inline-flex items-center gap-2 text-xs',
        variants[variant],
        sizes[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {dot && <span className="size-1.5 rounded-full bg-brand" />}
      {children}
    </span>
  )
}
