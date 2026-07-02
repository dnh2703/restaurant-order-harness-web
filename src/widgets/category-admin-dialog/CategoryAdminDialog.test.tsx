import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { AdminCategoryView } from '@/shared/api/menu-admin'
import { CategoryAdminDialog } from './CategoryAdminDialog'

const categories: AdminCategoryView[] = [
  { id: 'c2', restaurantId: 'r1', name: 'Đồ uống', sortOrder: 2 },
  { id: 'c1', restaurantId: 'r1', name: 'Món chính', sortOrder: 1 },
]

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

function setup(overrides: Partial<React.ComponentProps<typeof CategoryAdminDialog>> = {}) {
  const props = {
    open: true,
    onOpenChange: vi.fn(),
    categories,
    onCreate: vi.fn().mockResolvedValue(undefined),
    onUpdate: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }

  const view = render(<CategoryAdminDialog {...props} />)

  return { props, ...view }
}

describe('CategoryAdminDialog', () => {
  it('renders categories sorted by sortOrder then Vietnamese name with sortOrder', () => {
    setup({
      categories: [
        { id: 'c3', restaurantId: 'r1', name: 'Tráng miệng', sortOrder: 2 },
        { id: 'c2', restaurantId: 'r1', name: 'Đồ uống', sortOrder: 2 },
        { id: 'c1', restaurantId: 'r1', name: 'Món chính', sortOrder: 1 },
      ],
    })

    const rows = screen.getAllByRole('row').slice(1)

    expect(rows.map((row) => within(row).getAllByRole('cell')[0]?.textContent)).toEqual([
      'Món chính',
      'Đồ uống',
      'Tráng miệng',
    ])
    expect(within(rows[0]!).getByText('1')).toBeInTheDocument()
    expect(within(rows[1]!).getByText('2')).toBeInTheDocument()
  })

  it('create form trims name and calls onCreate with name and sortOrder', async () => {
    const { props } = setup()

    fireEvent.change(screen.getByLabelText('Tên danh mục mới'), {
      target: { value: '  Tráng miệng  ' },
    })
    fireEvent.change(screen.getByLabelText('Thứ tự mới'), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Thêm danh mục' }))

    await waitFor(() => {
      expect(props.onCreate).toHaveBeenCalledWith({ name: 'Tráng miệng', sortOrder: 3 })
    })
  })

  it('adds stable form names and disables browser autocomplete', () => {
    setup()

    expect(screen.getByLabelText('Tên danh mục mới')).toHaveAttribute('name', 'newCategoryName')
    expect(screen.getByLabelText('Tên danh mục mới')).toHaveAttribute('autocomplete', 'off')
    expect(screen.getByLabelText('Thứ tự mới')).toHaveAttribute('name', 'newCategorySortOrder')
    expect(screen.getByLabelText('Thứ tự mới')).toHaveAttribute('autocomplete', 'off')

    fireEvent.click(
      within(screen.getByRole('row', { name: /Món chính/ })).getByRole('button', { name: 'Sửa' }),
    )

    expect(screen.getByLabelText('Tên danh mục')).toHaveAttribute('name', 'editCategoryName')
    expect(screen.getByLabelText('Tên danh mục')).toHaveAttribute('autocomplete', 'off')
    expect(screen.getByLabelText('Thứ tự')).toHaveAttribute('name', 'editCategorySortOrder')
    expect(screen.getByLabelText('Thứ tự')).toHaveAttribute('autocomplete', 'off')
  })

  it('edit flow updates name and sortOrder and calls onUpdate', async () => {
    const { props } = setup()

    fireEvent.click(
      within(screen.getByRole('row', { name: /Món chính/ })).getByRole('button', { name: 'Sửa' }),
    )
    fireEvent.change(screen.getByLabelText('Tên danh mục'), { target: { value: '  Món nóng  ' } })
    fireEvent.change(screen.getByLabelText('Thứ tự'), { target: { value: '4' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu danh mục' }))

    await waitFor(() => {
      expect(props.onUpdate).toHaveBeenCalledWith({ id: 'c1', name: 'Món nóng', sortOrder: 4 })
    })
  })

  it('delete flow asks confirmation and calls onDelete with id', async () => {
    const { props } = setup()

    fireEvent.click(
      within(screen.getByRole('row', { name: /Đồ uống/ })).getByRole('button', { name: 'Xóa' }),
    )

    expect(screen.getByRole('alertdialog', { name: 'Xóa Đồ uống?' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Xóa danh mục' }))

    await waitFor(() => {
      expect(props.onDelete).toHaveBeenCalledWith('c2')
    })
  })

  it('busy state prevents duplicate create submits while awaiting promise', async () => {
    const pending = deferred<void>()
    const onCreate = vi.fn(() => pending.promise)
    setup({ onCreate })

    fireEvent.change(screen.getByLabelText('Tên danh mục mới'), {
      target: { value: 'Tráng miệng' },
    })
    fireEvent.change(screen.getByLabelText('Thứ tự mới'), { target: { value: '3' } })

    const submit = screen.getByRole('button', { name: 'Thêm danh mục' })
    fireEvent.click(submit)

    expect(screen.getByRole('button', { name: 'Đang thêm…' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Đang thêm…' }))
    expect(onCreate).toHaveBeenCalledTimes(1)

    pending.resolve()
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Đang thêm…' })).not.toBeInTheDocument()
    })
    expect(screen.getByLabelText('Tên danh mục mới')).toHaveValue('')
  })

  it('resets draft, edit, and delete state after closing', () => {
    const { props, rerender } = setup()

    fireEvent.change(screen.getByLabelText('Tên danh mục mới'), {
      target: { value: 'Tráng miệng' },
    })
    fireEvent.change(screen.getByLabelText('Thứ tự mới'), { target: { value: '3' } })
    fireEvent.click(
      within(screen.getByRole('row', { name: /Món chính/ })).getByRole('button', { name: 'Sửa' }),
    )
    fireEvent.change(screen.getByLabelText('Tên danh mục'), { target: { value: 'Món nóng' } })
    fireEvent.click(
      within(screen.getByRole('row', { name: /Đồ uống/ })).getByRole('button', { name: 'Xóa' }),
    )

    rerender(<CategoryAdminDialog {...props} open={false} />)
    rerender(<CategoryAdminDialog {...props} open />)

    expect(screen.getByLabelText('Tên danh mục mới')).toHaveValue('')
    expect(screen.getByLabelText('Thứ tự mới')).toHaveValue(null)
    expect(screen.queryByLabelText('Tên danh mục')).not.toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})
