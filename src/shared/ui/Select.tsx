import { CaretDownIcon, CheckIcon } from '@phosphor-icons/react'
import { Select as SelectPrimitive } from 'radix-ui'
import { cn } from '@/shared/lib/cn'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface Props {
  value?: string
  onValueChange?: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  ariaLabel?: string
  triggerId?: string
  disabled?: boolean
  className?: string
  contentClassName?: string
}

export function Select({
  value,
  onValueChange,
  options,
  placeholder,
  ariaLabel,
  triggerId,
  disabled,
  className,
  contentClassName,
}: Props) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectPrimitive.Trigger
        id={triggerId}
        aria-label={ariaLabel}
        data-slot="select-trigger"
        className={cn(
          'flex h-11 min-w-20 cursor-pointer items-center justify-between gap-2 rounded-control border border-line-strong bg-white px-4 font-semibold text-ink outline-none disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <CaretDownIcon aria-hidden size={16} weight="bold" className="text-muted" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          data-slot="select-content"
          className={cn(
            'z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-control border border-line-strong bg-white p-1 text-sm text-ink shadow-card',
            contentClassName,
          )}
        >
          <SelectPrimitive.Viewport>
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                data-slot="select-item"
                className="relative flex cursor-pointer items-center rounded-lg py-2 pr-8 pl-3 font-semibold outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[highlighted]:bg-page"
              >
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute right-2 inline-flex items-center text-brand">
                  <CheckIcon aria-hidden size={16} weight="bold" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
