import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { Skeleton } from './Skeleton'

describe('Skeleton', () => {
  it('renders a pulsing placeholder and merges the passed className', () => {
    const { container } = render(<Skeleton className="h-4 w-10" />)
    const el = container.querySelector('[data-slot="skeleton"]')
    expect(el).not.toBeNull()
    expect(el?.className).toContain('animate-pulse')
    expect(el?.className).toContain('h-4')
    expect(el?.className).toContain('w-10')
  })
})
