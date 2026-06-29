import type { ReactNode } from 'react'

interface Props {
  active?: boolean
  onClick?: () => void
  children: ReactNode
}

/** Single-select pill toggle (e.g. category filters). */
export function Chip({ active = false, onClick, children }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'rounded-control px-4 py-2.5 text-sm font-semibold whitespace-nowrap ' +
        (active ? 'bg-ink text-white' : 'border border-line-strong bg-white text-secondary')
      }
    >
      {children}
    </button>
  )
}
