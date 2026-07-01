import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SoldOutPanel } from './SoldOutPanel'
import type { KitchenMenuItem } from '@/shared/api/kitchen'

const items: KitchenMenuItem[] = [
  { id: 'm1', name: 'Phở bò', isAvailable: true },
  { id: 'm2', name: 'Bún chả', isAvailable: false },
]

describe('SoldOutPanel', () => {
  it('lists items and toggles availability', async () => {
    const onToggle = vi.fn()
    render(<SoldOutPanel open onOpenChange={vi.fn()} items={items} onToggle={onToggle} />)
    // "Phở bò" is available -> action marks it sold out (next = false)
    fireEvent.click(await screen.findByRole('button', { name: /Tạm hết.*Phở bò|Phở bò.*Tạm hết/ }))
    expect(onToggle).toHaveBeenCalledWith('m1', false)
  })
})
