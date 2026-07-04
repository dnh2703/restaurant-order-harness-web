import { describe, it, expect } from 'vitest'
import { resolveCashierAccess } from './cashier'
import type { StaffUser } from '@/entities/staff'

const cashier: StaffUser = {
  id: 'u1',
  email: 'c@x',
  name: 'Thu',
  role: 'CASHIER',
  restaurantId: 'r1',
}
const kitchen: StaffUser = { ...cashier, role: 'KITCHEN' }
const admin: StaffUser = { ...cashier, role: 'ADMIN' }

describe('resolveCashierAccess', () => {
  it('always allows the login route', () => {
    expect(resolveCashierAccess('/cashier/login', null)).toEqual({ allow: true })
  })
  it('allows CASHIER and ADMIN into the area', () => {
    expect(resolveCashierAccess('/cashier', cashier)).toEqual({ allow: true })
    expect(resolveCashierAccess('/cashier', admin)).toEqual({ allow: true })
  })
  it('redirects a missing session or a non-cashier role to login', () => {
    expect(resolveCashierAccess('/cashier', null)).toEqual({
      allow: false,
      redirectTo: '/cashier/login',
    })
    expect(resolveCashierAccess('/cashier', kitchen)).toEqual({
      allow: false,
      redirectTo: '/cashier/login',
    })
  })
})
