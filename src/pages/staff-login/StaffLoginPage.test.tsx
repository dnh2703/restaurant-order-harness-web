import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StaffLoginPage } from './StaffLoginPage'

describe('StaffLoginPage', () => {
  it('submits the entered credentials', async () => {
    const onSubmit = vi.fn(() => Promise.resolve())
    render(<StaffLoginPage onSubmit={onSubmit} />)
    fireEvent.change(screen.getByPlaceholderText(/Email/), {
      target: { value: 'kitchen@demo.test' },
    })
    fireEvent.change(screen.getByPlaceholderText(/Mật khẩu/), {
      target: { value: 'kitchen-password' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Đăng nhập/ }))
    expect(onSubmit).toHaveBeenCalledWith('kitchen@demo.test', 'kitchen-password')
  })

  it('shows the error message when login rejects', async () => {
    const onSubmit = vi.fn(() => Promise.reject(new Error('Email hoặc mật khẩu không đúng')))
    render(<StaffLoginPage onSubmit={onSubmit} />)
    fireEvent.change(screen.getByPlaceholderText(/Email/), { target: { value: 'x' } })
    fireEvent.change(screen.getByPlaceholderText(/Mật khẩu/), { target: { value: 'y' } })
    fireEvent.click(screen.getByRole('button', { name: /Đăng nhập/ }))
    expect(await screen.findByText('Email hoặc mật khẩu không đúng')).toBeInTheDocument()
  })
})
