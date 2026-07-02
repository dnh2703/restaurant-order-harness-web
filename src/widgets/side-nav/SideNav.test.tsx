import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SideNav } from './SideNav'

describe('SideNav', () => {
  it('shows the Bếp tab, the user, and a working logout for kitchen staff', () => {
    const onLogout = vi.fn()
    render(
      <SideNav userName="Đầu Bếp" userRole="KITCHEN" onLogout={onLogout} activeSection="board" />,
    )

    expect(screen.getByRole('link', { name: /Bếp/ })).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByRole('link', { name: /Bàn ăn/ })).not.toBeInTheDocument()
    expect(screen.getByText('Đầu Bếp')).toBeInTheDocument()
    expect(screen.getByText('Nhân viên bếp')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Đăng xuất/ }))
    expect(onLogout).toHaveBeenCalledTimes(1)
  })

  it('shows Bàn ăn for admin', () => {
    render(
      <SideNav userName="Quản Lý" userRole="ADMIN" onLogout={vi.fn()} activeSection="tables" />,
    )
    expect(screen.getByRole('link', { name: /Bếp/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Bàn ăn/ })).toHaveAttribute('aria-current', 'page')
  })
})
