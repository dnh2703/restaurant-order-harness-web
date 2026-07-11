import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Popover, PopoverContent, PopoverTrigger } from './Popover'

describe('Popover', () => {
  it('renders content when open', () => {
    render(
      <Popover open>
        <PopoverTrigger>Mở</PopoverTrigger>
        <PopoverContent>Nội dung lịch</PopoverContent>
      </Popover>,
    )
    expect(screen.getByText('Nội dung lịch')).toBeInTheDocument()
  })

  it('does not render content when closed', () => {
    render(
      <Popover open={false}>
        <PopoverTrigger>Mở</PopoverTrigger>
        <PopoverContent>Nội dung lịch</PopoverContent>
      </Popover>,
    )
    expect(screen.queryByText('Nội dung lịch')).not.toBeInTheDocument()
  })
})
