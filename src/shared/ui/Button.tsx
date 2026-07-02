import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/shared/lib/cn'

export const buttonVariants = cva(
  'cursor-pointer rounded-button text-center font-bold disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-brand text-white',
        secondary: 'border border-line-strong bg-white text-secondary',
        ghost: 'bg-transparent text-brand',
      },
      size: {
        sm: 'px-3 py-2 text-xs',
        md: 'px-4 py-2.5 text-sm',
        lg: 'px-4 py-4 text-base',
      },
      fullWidth: { true: 'w-full' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>['variant']>
export type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>['size']>

interface Props extends ComponentProps<'button'>, VariantProps<typeof buttonVariants> {}

/** Styled button primitive. Defaults to a non-submitting primary button. */
export function Button({ className, variant, size, fullWidth, type = 'button', ...props }: Props) {
  return (
    <button
      data-slot="button"
      type={type}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      {...props}
    />
  )
}
