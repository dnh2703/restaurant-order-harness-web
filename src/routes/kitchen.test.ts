import { describe, expect, it } from 'vitest'
import type { StaffUser } from '@/entities/staff'
import { kitchenLandingForRole, resolveKitchenAccess } from './kitchen'

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
      redirectTo: '/kitchen/cashier',
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

  it('requires an admin session for reports', () => {
    expect(resolveKitchenAccess('/kitchen/reports', null)).toEqual({
      allow: false,
      redirectTo: '/kitchen/login',
    })
    expect(resolveKitchenAccess('/kitchen/reports', kitchen)).toEqual({
      allow: false,
      redirectTo: '/kitchen',
    })
    expect(resolveKitchenAccess('/kitchen/reports', cashier)).toEqual({
      allow: false,
      redirectTo: '/kitchen/cashier',
    })
    expect(resolveKitchenAccess('/kitchen/reports', admin)).toEqual({ allow: true })
  })

  it('lets cashier and admin into the cashier screen, kitchen staff to their board', () => {
    expect(resolveKitchenAccess('/kitchen/cashier', cashier)).toEqual({ allow: true })
    expect(resolveKitchenAccess('/kitchen/cashier', admin)).toEqual({ allow: true })
    expect(resolveKitchenAccess('/kitchen/cashier', kitchen)).toEqual({
      allow: false,
      redirectTo: '/kitchen',
    })
    expect(resolveKitchenAccess('/kitchen/cashier', null)).toEqual({
      allow: false,
      redirectTo: '/kitchen/login',
    })
  })

  it('bounces a cashier off the kitchen board to the cashier screen', () => {
    expect(resolveKitchenAccess('/kitchen', cashier)).toEqual({
      allow: false,
      redirectTo: '/kitchen/cashier',
    })
    expect(resolveKitchenAccess('/kitchen', kitchen)).toEqual({ allow: true })
    expect(resolveKitchenAccess('/kitchen', admin)).toEqual({ allow: true })
  })
})

describe('kitchenLandingForRole', () => {
  it('sends cashiers to the cashier screen and everyone else to the board', () => {
    expect(kitchenLandingForRole('CASHIER')).toBe('/kitchen/cashier')
    expect(kitchenLandingForRole('KITCHEN')).toBe('/kitchen')
    expect(kitchenLandingForRole('ADMIN')).toBe('/kitchen')
  })
})
