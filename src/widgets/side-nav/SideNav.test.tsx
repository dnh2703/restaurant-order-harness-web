import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SideNav } from './SideNav'

describe('SideNav', () => {
  it('shows the single Bếp tab, the user, and a working logout', () => {
    const onLogout = vi.fn()
    render(<SideNav userName="Đầu Bếp" userRole="KITCHEN" onLogout={onLogout} />)

    expect(screen.getByRole('link', { name: /Bếp/ })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('Đầu Bếp')).toBeInTheDocument()
    expect(screen.getByText('Nhân viên bếp')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Đăng xuất/ }))
    expect(onLogout).toHaveBeenCalledTimes(1)
  })
})
