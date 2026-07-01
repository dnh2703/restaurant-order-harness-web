import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrandMark } from './BrandMark'

describe('BrandMark', () => {
  it('renders the chef-hat mark with a wordmark label', () => {
    const { container } = render(<BrandMark label="Nhà bếp" />)
    expect(screen.getByText('Nhà bếp')).toBeInTheDocument()
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders the mark alone when no label is given', () => {
    const { container } = render(<BrandMark />)
    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(screen.queryByText('Nhà bếp')).toBeNull()
  })
})
