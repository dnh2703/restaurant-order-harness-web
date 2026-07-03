import { describe, expect, it } from 'vitest'
import type { StaffUser } from '@/entities/staff'
import { resolveKitchenAccess } from './kitchen'

const admin: StaffUser = {
  id: 'u-admin',
  email: 'admin@demo.test',
  name: 'Admin',
  role: 'ADMIN',
  restaurantId: 'r1',
}

const kitchen: StaffUser = { ...admin, id: 'u-kitchen', role: 'KITCHEN' }
const cashier: StaffUser = { ...admin, id: 'u-cashier', role: 'CASHIER' }

describe('resolveKitchenAccess', () => {
  it('keeps only the exact kitchen login route public', () => {
    expect(resolveKitchenAccess('/kitchen/login', null)).toEqual({ allow: true })
    expect(resolveKitchenAccess('/kitchen/login-help', null)).toEqual({
      allow: false,
      redirectTo: '/kitchen/login',
    })
  })

  it('requires an admin session for menu administration', () => {
    expect(resolveKitchenAccess('/kitchen/menu', null)).toEqual({
      allow: false,
      redirectTo: '/kitchen/login',
    })
    expect(resolveKitchenAccess('/kitchen/menu', kitchen)).toEqual({
      allow: false,
      redirectTo: '/kitchen',
    })
    expect(resolveKitchenAccess('/kitchen/menu', cashier)).toEqual({
      allow: false,
      redirectTo: '/kitchen/login',
    })
    expect(resolveKitchenAccess('/kitchen/menu', admin)).toEqual({ allow: true })
  })

  it('preserves the existing admin-only table guard', () => {
    expect(resolveKitchenAccess('/kitchen/tables', kitchen)).toEqual({
      allow: false,
      redirectTo: '/kitchen',
    })
    expect(resolveKitchenAccess('/kitchen/tables', admin)).toEqual({ allow: true })
  })
})
