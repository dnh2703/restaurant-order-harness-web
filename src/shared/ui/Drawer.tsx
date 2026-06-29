import { useEffect, type ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  children: ReactNode
  /** Extra classes for the full-screen overlay (e.g. `lg:hidden`). */
  overlayClassName?: string
  /** Extra classes for the sliding panel. */
  className?: string
}

/** Bottom sheet: a dimmed overlay (click / Escape closes) over a panel. */
export function Drawer({ open, onClose, children, overlayClassName = '', className = '' }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className={'fixed inset-0 z-40 flex flex-col justify-end bg-black/40 ' + overlayClassName}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={'max-h-[85vh] overflow-hidden rounded-t-card bg-white ' + className}
      >
        {children}
      </div>
    </div>
  )
}
