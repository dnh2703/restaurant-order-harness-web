import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button, Chip, Input, Drawer, DrawerContent, DrawerTitle, Badge, DataTable } from './index'

describe('Button', () => {
  it('renders children, defaults to type=button, and tags data-slot', () => {
    render(<Button>Gửi</Button>)
    const btn = screen.getByRole('button', { name: 'Gửi' })
    expect(btn).toHaveAttribute('type', 'button')
    expect(btn).toHaveAttribute('data-slot', 'button')
  })
  it('lets className override base utilities via cn (tailwind-merge)', () => {
    render(
      <Button size="md" className="py-8">
        X
      </Button>,
    )
    // base size md is py-2.5; the override wins and the base is dropped.
    const cls = screen.getByRole('button', { name: 'X' }).className
    expect(cls).toContain('py-8')
    expect(cls).not.toContain('py-2.5')
  })
  it('applies the primary variant and fires onClick', () => {
    const onClick = vi.fn()
    render(
      <Button variant="primary" onClick={onClick}>
        Go
      </Button>,
    )
    const btn = screen.getByRole('button', { name: 'Go' })
    expect(btn.className).toContain('bg-brand')
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
  it('styles the active state as brand/white', () => {
    render(<Chip active>Tất cả</Chip>)
    expect(screen.getByRole('button', { name: 'Tất cả' }).className).toContain('bg-brand')
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
      <Drawer open={false} onOpenChange={() => {}}>
        <DrawerContent>
          <DrawerTitle>Giỏ của bạn</DrawerTitle>
          <p>Panel</p>
        </DrawerContent>
      </Drawer>,
    )
    expect(screen.queryByText('Panel')).not.toBeInTheDocument()
  })
  it('renders content and title when open', () => {
    render(
      <Drawer open onOpenChange={() => {}}>
        <DrawerContent>
          <DrawerTitle>Giỏ của bạn</DrawerTitle>
          <p>Panel</p>
        </DrawerContent>
      </Drawer>,
    )
    expect(screen.getByText('Panel')).toBeInTheDocument()
    expect(screen.getByText('Giỏ của bạn')).toBeInTheDocument()
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

describe('DataTable', () => {
  it('renders headers and row cells from column definitions', () => {
    render(
      <DataTable
        columns={[
          { id: 'name', header: 'Tên', cell: (row: { name: string; seats: number }) => row.name },
          { id: 'seats', header: 'Ghế', cell: (row) => row.seats },
        ]}
        data={[
          { id: '1', name: 'Bàn 1', seats: 4 },
          { id: '2', name: 'Bàn 2', seats: 2 },
        ]}
        getRowKey={(row) => row.id}
      />,
    )

    expect(screen.getByRole('columnheader', { name: 'Tên' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Ghế' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Bàn 1' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: '4' })).toBeInTheDocument()
  })

  it('renders an empty state across all columns', () => {
    render(
      <DataTable
        columns={[{ id: 'name', header: 'Tên', cell: (row: { name: string }) => row.name }]}
        data={[]}
        getRowKey={(row) => row.name}
        emptyMessage="Chưa có dữ liệu"
      />,
    )

    expect(screen.getByText('Chưa có dữ liệu')).toHaveAttribute('colspan', '1')
  })

  it('uses stronger table contrast classes', () => {
    const { container } = render(
      <DataTable
        columns={[{ id: 'name', header: 'Tên', cell: (row: { name: string }) => row.name }]}
        data={[{ name: 'Bàn 1' }]}
        getRowKey={(row) => row.name}
      />,
    )

    expect(container.querySelector('[data-slot="data-table"]')?.className).toContain(
      'border-line-strong',
    )
    expect(screen.getByRole('columnheader', { name: 'Tên' }).className).toContain('text-secondary')
    expect(screen.getByRole('row', { name: 'Bàn 1' }).className).toContain('hover:bg-page')
  })
})
