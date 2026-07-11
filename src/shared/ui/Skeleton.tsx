import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/cn'

/** Pulsing placeholder block for loading states (shadcn-style). */
export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('animate-pulse rounded-control bg-black/[0.06]', className)}
      {...props}
    />
  )
}
