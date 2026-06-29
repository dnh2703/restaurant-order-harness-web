import type { InputHTMLAttributes, ReactNode } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  /** Optional decorative icon rendered before the input (aria-hidden). */
  leadingIcon?: ReactNode
  /** Extra classes for the filled container (e.g. width/height). */
  containerClassName?: string
}

/** Filled text input with an optional leading icon. */
export function Input({ leadingIcon, containerClassName = '', className = '', ...rest }: Props) {
  return (
    <label
      className={'flex items-center gap-2 rounded-control bg-page px-3.5 ' + containerClassName}
    >
      {leadingIcon != null && (
        <span aria-hidden className="text-muted">
          {leadingIcon}
        </span>
      )}
      <input
        className={
          'w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted ' + className
        }
        {...rest}
      />
    </label>
  )
}
