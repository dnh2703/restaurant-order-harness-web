import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { AdminCategoryView, AdminMenuItemView } from '@/shared/api/menu-admin'
import { MenuItemDialog } from './MenuItemDialog'

const categories: AdminCategoryView[] = [
  { id: 'c1', restaurantId: 'r1', name: 'Món chính', sortOrder: 1 },
  { id: 'c2', restaurantId: 'r1', name: 'Đồ uống', sortOrder: 2 },
]

const item: AdminMenuItemView = {
  id: 'i1',
  categoryId: 'c2',
  name: 'Trà đào',
  description: 'Ly lớn',
  price: 35000,
  imageUrl: 'https://cdn.test/tra-dao.jpg',
  isAvailable: false,
  sortOrder: 4,
}

function setup(overrides: Partial<React.ComponentProps<typeof MenuItemDialog>> = {}) {
  const props = {
    open: true,
    onOpenChange: vi.fn(),
    categories,
    item: null,
    onSave: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }

  const view = render(<MenuItemDialog {...props} />)

  return { props, ...view }
}

describe('MenuItemDialog', () => {
  it('create mode submits trimmed fields with numeric price and sortOrder', async () => {
    const { props } = setup()

    fireEvent.change(screen.getByLabelText('Tên món'), { target: { value: '  Phở bò  ' } })
    fireEvent.click(screen.getByRole('combobox', { name: 'Danh mục' }))
    fireEvent.click(screen.getByRole('option', { name: 'Đồ uống' }))
    fireEvent.change(screen.getByLabelText('Giá'), { target: { value: '50000' } })
    fireEvent.change(screen.getByLabelText('Mô tả'), { target: { value: '  Tô lớn  ' } })
    fireEvent.change(screen.getByLabelText('Ảnh'), {
      target: { value: '  https://cdn.test/pho.jpg  ' },
    })
    fireEvent.click(screen.getByLabelText('Còn món'))
    fireEvent.change(screen.getByLabelText('Thứ tự'), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu món' }))

    await waitFor(() => {
      expect(props.onSave).toHaveBeenCalledWith({
        categoryId: 'c2',
        name: 'Phở bò',
        price: 50000,
        description: 'Tô lớn',
        imageUrl: 'https://cdn.test/pho.jpg',
        isAvailable: false,
        sortOrder: 2,
      })
    })
    expect(props.onOpenChange).toHaveBeenCalledWith(false)
  })

  it('create mode sends null for empty optional text fields and falls back numbers to 0', async () => {
    const { props } = setup()

    fireEvent.change(screen.getByLabelText('Tên món'), { target: { value: '  Bún bò  ' } })
    fireEvent.change(screen.getByLabelText('Giá'), { target: { value: 'không phải số' } })
    fireEvent.change(screen.getByLabelText('Mô tả'), { target: { value: '   ' } })
    fireEvent.change(screen.getByLabelText('Ảnh'), { target: { value: '   ' } })
    fireEvent.change(screen.getByLabelText('Thứ tự'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu món' }))

    await waitFor(() => {
      expect(props.onSave).toHaveBeenCalledWith({
        categoryId: 'c1',
        name: 'Bún bò',
        price: 0,
        description: null,
        imageUrl: null,
        isAvailable: true,
        sortOrder: 0,
      })
    })
  })

  it('edit mode pre-fills existing item and submits id with fields', async () => {
    const { props } = setup({ item })

    expect(screen.getByLabelText('Tên món')).toHaveValue('Trà đào')
    expect(screen.getByLabelText('Giá')).toHaveValue(35000)
    expect(screen.getByLabelText('Mô tả')).toHaveValue('Ly lớn')
    expect(screen.getByLabelText('Ảnh')).toHaveValue('https://cdn.test/tra-dao.jpg')
    expect(screen.getByLabelText('Còn món')).not.toBeChecked()
    expect(screen.getByLabelText('Thứ tự')).toHaveValue(4)

    fireEvent.change(screen.getByLabelText('Tên món'), { target: { value: '  Trà vải  ' } })
    fireEvent.change(screen.getByLabelText('Giá'), { target: { value: '39000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu món' }))

    await waitFor(() => {
      expect(props.onSave).toHaveBeenCalledWith({
        id: 'i1',
        categoryId: 'c2',
        name: 'Trà vải',
        price: 39000,
        description: 'Ly lớn',
        imageUrl: 'https://cdn.test/tra-dao.jpg',
        isAvailable: false,
        sortOrder: 4,
      })
    })
    expect(props.onOpenChange).toHaveBeenCalledWith(false)
  })

  it('disables save when no categories exist', () => {
    setup({ categories: [] })

    expect(screen.getByRole('button', { name: 'Lưu món' })).toBeDisabled()
    expect(screen.getByText('Cần tạo danh mục trước khi thêm món.')).toBeInTheDocument()
  })

  it('renders image preview when imageUrl is present', () => {
    setup({ item })

    expect(screen.getByRole('img', { name: 'Xem trước ảnh món' })).toHaveAttribute(
      'src',
      'https://cdn.test/tra-dao.jpg',
    )
  })
})
