import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button, Chip, Input, Drawer, Badge } from './index'

describe('Button', () => {
  it('renders children and defaults to type=button', () => {
    render(<Button>Gửi</Button>)
    const btn = screen.getByRole('button', { name: 'Gửi' })
    expect(btn).toHaveAttribute('type', 'button')
  })
  it('applies the primary variant and fires onClick', () => {
    const onClick = vi.fn()
    render(
      <Button variant="primary" onClick={onClick}>
        Go
      </Button>,
    )
    const btn = screen.getByRole('button', { name: 'Go' })
    expect(btn.className).toContain('bg-ink')
    fireEvent.click(btn)
    expect(onClick).toHaveBeenCalled()
  })
  it('honors disabled', () => {
    render(<Button disabled>X</Button>)
    expect(screen.getByRole('button', { name: 'X' })).toBeDisabled()
  })
})

describe('Chip', () => {
  it('renders children and fires onClick', () => {
    const onClick = vi.fn()
    render(<Chip onClick={onClick}>Khai vị</Chip>)
    fireEvent.click(screen.getByRole('button', { name: 'Khai vị' }))
    expect(onClick).toHaveBeenCalled()
  })
  it('styles the active state as ink/white', () => {
    render(<Chip active>Tất cả</Chip>)
    expect(screen.getByRole('button', { name: 'Tất cả' }).className).toContain('bg-ink')
  })
})

describe('Input', () => {
  it('forwards props and renders a leading icon', () => {
    const onChange = vi.fn()
    render(<Input placeholder="Tìm món…" leadingIcon="⌕" onChange={onChange} />)
    const input = screen.getByPlaceholderText('Tìm món…')
    fireEvent.change(input, { target: { value: 'pho' } })
    expect(onChange).toHaveBeenCalled()
    expect(screen.getByText('⌕')).toHaveAttribute('aria-hidden')
  })
})

describe('Drawer', () => {
  it('renders nothing when closed', () => {
    render(
      <Drawer open={false} onClose={() => {}}>
        <p>Panel</p>
      </Drawer>,
    )
    expect(screen.queryByText('Panel')).not.toBeInTheDocument()
  })
  it('closes on overlay click but not on panel click', () => {
    const onClose = vi.fn()
    render(
      <Drawer open onClose={onClose}>
        <p>Panel</p>
      </Drawer>,
    )
    fireEvent.click(screen.getByText('Panel'))
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('dialog'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('Badge', () => {
  it('renders children with the brand variant by default', () => {
    render(<Badge>3 món</Badge>)
    expect(screen.getByText('3 món').className).toContain('text-brand')
  })
  it('renders a status dot when dot is set', () => {
    const { container } = render(
      <Badge variant="outline" dot>
        Bàn 12
      </Badge>,
    )
    expect(container.querySelector('.rounded-full')).not.toBeNull()
  })
})
