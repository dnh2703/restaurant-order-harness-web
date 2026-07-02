import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { AdminOptionGroupView } from '@/shared/api/menu-admin'
import { OptionEditor } from './OptionEditor'

const groups: AdminOptionGroupView[] = [
  {
    id: 'g1',
    menuItemId: 'm1',
    name: 'Size',
    type: 'SINGLE',
    isRequired: true,
    options: [{ id: 'o1', optionGroupId: 'g1', name: 'Lớn', priceDelta: 10000 }],
  },
]

function setup(overrides: Partial<React.ComponentProps<typeof OptionEditor>> = {}) {
  const props = {
    menuItemId: 'm1' as string | null,
    groups,
    onCreateGroup: vi.fn().mockResolvedValue(undefined),
    onUpdateGroup: vi.fn().mockResolvedValue(undefined),
    onDeleteGroup: vi.fn().mockResolvedValue(undefined),
    onCreateOption: vi.fn().mockResolvedValue(undefined),
    onUpdateOption: vi.fn().mockResolvedValue(undefined),
    onDeleteOption: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }

  const view = render(<OptionEditor {...props} />)

  return { props, ...view }
}

describe('OptionEditor', () => {
  it('shows disabled copy and no controls until the dish is saved', () => {
    setup({ menuItemId: null, groups: [] })

    expect(screen.getByText('Lưu món trước khi thêm tùy chọn.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Thêm nhóm' })).not.toBeInTheDocument()
  })

  it('renders existing groups and their options', () => {
    setup()

    const group = screen.getByRole('region', { name: 'Nhóm Size' })
    const option = within(group).getByRole('group', { name: 'Tùy chọn Lớn' })
    expect(within(option).getByLabelText('Tên tùy chọn')).toHaveValue('Lớn')
    expect(within(option).getByLabelText('Giá thêm')).toHaveValue(10000)
  })

  it('creates a group with trimmed name, selected type, and required flag', async () => {
    const { props } = setup({ groups: [] })

    fireEvent.change(screen.getByLabelText('Tên nhóm mới'), { target: { value: '  Topping  ' } })
    fireEvent.click(screen.getByRole('combobox', { name: 'Loại nhóm mới' }))
    fireEvent.click(screen.getByRole('option', { name: 'Chọn nhiều' }))
    fireEvent.click(screen.getByLabelText('Bắt buộc'))
    fireEvent.click(screen.getByRole('button', { name: 'Thêm nhóm' }))

    await waitFor(() => {
      expect(props.onCreateGroup).toHaveBeenCalledWith({
        name: 'Topping',
        type: 'MULTI',
        isRequired: true,
      })
    })
  })

  it('creates an option in a group with trimmed name and numeric price delta', async () => {
    const { props } = setup({
      groups: [
        {
          id: 'g1',
          menuItemId: 'm1',
          name: 'Size',
          type: 'SINGLE',
          isRequired: false,
          options: [],
        },
      ],
    })

    const group = screen.getByRole('region', { name: 'Nhóm Size' })
    fireEvent.change(within(group).getByLabelText('Tên tùy chọn mới'), {
      target: { value: '  Nhỏ  ' },
    })
    fireEvent.change(within(group).getByLabelText('Giá thêm mới'), { target: { value: '5000' } })
    fireEvent.click(within(group).getByRole('button', { name: 'Thêm tùy chọn' }))

    await waitFor(() => {
      expect(props.onCreateOption).toHaveBeenCalledWith('g1', { name: 'Nhỏ', priceDelta: 5000 })
    })
  })

  it('updates an option name and price delta', async () => {
    const { props } = setup()

    const group = screen.getByRole('region', { name: 'Nhóm Size' })
    const option = within(group).getByRole('group', { name: 'Tùy chọn Lớn' })
    fireEvent.change(within(option).getByLabelText('Tên tùy chọn'), {
      target: { value: '  Cực lớn  ' },
    })
    fireEvent.change(within(option).getByLabelText('Giá thêm'), { target: { value: '15000' } })
    fireEvent.click(within(option).getByRole('button', { name: 'Lưu' }))

    await waitFor(() => {
      expect(props.onUpdateOption).toHaveBeenCalledWith('g1', 'o1', {
        name: 'Cực lớn',
        priceDelta: 15000,
      })
    })
  })

  it('deletes a group and an option', async () => {
    const { props } = setup()

    const group = screen.getByRole('region', { name: 'Nhóm Size' })
    const option = within(group).getByRole('group', { name: 'Tùy chọn Lớn' })
    fireEvent.click(within(option).getByRole('button', { name: 'Xóa' }))
    fireEvent.click(within(group).getByRole('button', { name: 'Xóa nhóm' }))

    await waitFor(() => {
      expect(props.onDeleteOption).toHaveBeenCalledWith('g1', 'o1')
    })
    expect(props.onDeleteGroup).toHaveBeenCalledWith('g1')
  })
})
