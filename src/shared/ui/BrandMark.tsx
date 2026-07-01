import { ChefHatIcon } from '@phosphor-icons/react'
import { cn } from '@/shared/lib/cn'

const SIZES = {
  sm: { box: 'size-9', icon: 20, text: 'text-base' },
  md: { box: 'size-10', icon: 22, text: 'text-lg' },
  lg: { box: 'size-14', icon: 30, text: 'text-2xl' },
} as const

interface Props {
  /** Tile + wordmark scale. Defaults to `md`. */
  size?: keyof typeof SIZES
  /** Optional wordmark shown next to the tile. */
  label?: string
  className?: string
}

/** Kitchen brand logo: a chef-hat mark in a brand-colored tile, with an optional wordmark. */
export function BrandMark({ size = 'md', label, className }: Props) {
  const s = SIZES[size]
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div
        className={cn(
          'flex items-center justify-center rounded-control bg-brand text-white',
          s.box,
        )}
      >
        <ChefHatIcon size={s.icon} weight="fill" />
      </div>
      {label && (
        <span className={cn('font-extrabold tracking-tight text-ink', s.text)}>{label}</span>
      )}
    </div>
  )
}
