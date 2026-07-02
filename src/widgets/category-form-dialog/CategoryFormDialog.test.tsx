import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { AdminCategoryView } from '@/shared/api/menu-admin'
import { CategoryFormDialog } from './CategoryFormDialog'

const category: AdminCategoryView = {
  id: 'c1',
  restaurantId: 'r1',
  name: 'Món chính',
  sortOrder: 3,
}

function setup(overrides: Partial<React.ComponentProps<typeof CategoryFormDialog>> = {}) {
  const props = {
    open: true,
    onOpenChange: vi.fn(),
    category: null,
    onSubmit: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
  render(<CategoryFormDialog {...props} />)
  return props
}

describe('CategoryFormDialog', () => {
  it('create mode submits trimmed name and parsed sort order then closes', async () => {
    const props = setup()

    expect(screen.getByRole('dialog', { name: 'Thêm danh mục' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Tên danh mục'), { target: { value: '  Đồ uống  ' } })
    fireEvent.change(screen.getByLabelText('Thứ tự'), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Thêm danh mục' }))

    await waitFor(() => {
      expect(props.onSubmit).toHaveBeenCalledWith({ name: 'Đồ uống', sortOrder: 2 })
    })
    expect(props.onOpenChange).toHaveBeenCalledWith(false)
  })

  it('create mode omits sort order when left blank', async () => {
    const props = setup()

    fireEvent.change(screen.getByLabelText('Tên danh mục'), { target: { value: 'Tráng miệng' } })
    fireEvent.click(screen.getByRole('button', { name: 'Thêm danh mục' }))

    await waitFor(() => {
      expect(props.onSubmit).toHaveBeenCalledWith({ name: 'Tráng miệng', sortOrder: undefined })
    })
  })

  it('edit mode pre-fills fields and submits with id', async () => {
    const props = setup({ category })

    expect(screen.getByRole('dialog', { name: 'Sửa danh mục' })).toBeInTheDocument()
    expect(screen.getByLabelText('Tên danh mục')).toHaveValue('Món chính')
    expect(screen.getByLabelText('Thứ tự')).toHaveValue(3)

    fireEvent.change(screen.getByLabelText('Tên danh mục'), { target: { value: '  Món nóng  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu danh mục' }))

    await waitFor(() => {
      expect(props.onSubmit).toHaveBeenCalledWith({ id: 'c1', name: 'Món nóng', sortOrder: 3 })
    })
  })

  it('keeps the dialog open when submit rejects', async () => {
    const props = setup({ onSubmit: vi.fn().mockRejectedValue(new Error('nope')) })

    fireEvent.change(screen.getByLabelText('Tên danh mục'), { target: { value: 'Tráng miệng' } })
    fireEvent.click(screen.getByRole('button', { name: 'Thêm danh mục' }))

    await waitFor(() => {
      expect(props.onSubmit).toHaveBeenCalled()
    })
    expect(props.onOpenChange).not.toHaveBeenCalledWith(false)
  })

  it('disables submit until a name is entered', () => {
    setup()

    expect(screen.getByRole('button', { name: 'Thêm danh mục' })).toBeDisabled()
  })
})
