import { describe, it, expect } from 'vitest'
import { ORDER_ITEM_STATUS_META, ORDER_ITEM_PROGRESS } from './status'

describe('order item status metadata', () => {
  it('has a Vietnamese label and tone for every status', () => {
    expect(ORDER_ITEM_STATUS_META.PENDING).toEqual({ label: 'Chờ xác nhận', tone: 'pending' })
    expect(ORDER_ITEM_STATUS_META.COOKING).toEqual({ label: 'Đang nấu', tone: 'cooking' })
    expect(ORDER_ITEM_STATUS_META.SERVED).toEqual({ label: 'Đã phục vụ', tone: 'served' })
    expect(ORDER_ITEM_STATUS_META.CANCELLED).toEqual({ label: 'Đã hủy', tone: 'cancelled' })
  })
  it('orders the active progress steps', () => {
    expect(ORDER_ITEM_PROGRESS).toEqual(['PENDING', 'COOKING', 'SERVED'])
  })
})
