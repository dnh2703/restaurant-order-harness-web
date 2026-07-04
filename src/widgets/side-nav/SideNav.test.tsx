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

  it('shows Thực đơn for admin', () => {
    render(<SideNav userName="Quản Lý" userRole="ADMIN" onLogout={vi.fn()} activeSection="board" />)

    expect(screen.getByRole('link', { name: /Thực đơn/ })).toHaveAttribute('href', '/kitchen/menu')
  })

  it('hides Thực đơn for kitchen staff', () => {
    render(
      <SideNav userName="Đầu Bếp" userRole="KITCHEN" onLogout={vi.fn()} activeSection="board" />,
    )

    expect(screen.queryByRole('link', { name: /Thực đơn/ })).not.toBeInTheDocument()
  })

  it('marks Thực đơn as current when menu is active', () => {
    render(<SideNav userName="Quản Lý" userRole="ADMIN" onLogout={vi.fn()} activeSection="menu" />)

    expect(screen.getByRole('link', { name: /Thực đơn/ })).toHaveAttribute('aria-current', 'page')
  })

  it('shows only the Thu ngân tab for a cashier, not the kitchen board', () => {
    render(
      <SideNav userName="Thu Ngân" userRole="CASHIER" onLogout={vi.fn()} activeSection="cashier" />,
    )

    const cashierTab = screen.getByRole('link', { name: /Thu ngân/ })
    expect(cashierTab).toHaveAttribute('href', '/kitchen/cashier')
    expect(cashierTab).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByRole('link', { name: /Bếp/ })).not.toBeInTheDocument()
  })

  it('shows the Thu ngân tab for admin alongside the kitchen tabs', () => {
    render(<SideNav userName="Quản Lý" userRole="ADMIN" onLogout={vi.fn()} activeSection="board" />)

    expect(screen.getByRole('link', { name: /Thu ngân/ })).toHaveAttribute(
      'href',
      '/kitchen/cashier',
    )
    expect(screen.getByRole('link', { name: /Bếp/ })).toBeInTheDocument()
  })

  it('hides the Thu ngân tab from kitchen staff', () => {
    render(
      <SideNav userName="Đầu Bếp" userRole="KITCHEN" onLogout={vi.fn()} activeSection="board" />,
    )

    expect(screen.queryByRole('link', { name: /Thu ngân/ })).not.toBeInTheDocument()
  })
})
