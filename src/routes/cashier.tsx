import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import type { StaffUser } from '@/entities/staff'
import { getStaffSession } from '@/shared/api/auth'

type CashierAccess = { allow: true } | { allow: false; redirectTo: '/cashier/login' }

export function resolveCashierAccess(pathname: string, session: StaffUser | null): CashierAccess {
  if (pathname === '/cashier/login') return { allow: true }
  if (!session || (session.role !== 'CASHIER' && session.role !== 'ADMIN')) {
    return { allow: false, redirectTo: '/cashier/login' }
  }
  return { allow: true }
}

export const Route = createFileRoute('/cashier')({
  beforeLoad: async ({ location }): Promise<{ session: StaffUser | null }> => {
    // The login route is public; everything else under /cashier requires a session.
    if (location.pathname === '/cashier/login') return { session: null }
    let session
    try {
      session = await getStaffSession()
    } catch {
      throw redirect({ to: '/cashier/login' })
    }

    const access = resolveCashierAccess(location.pathname, session)
    if (!access.allow) {
      throw redirect({ to: access.redirectTo })
    }
    // Child loaders reuse this session instead of re-fetching it — one auth round-trip per
    // navigation, avoiding a second token refresh that would rotate the refresh token again.
    return { session }
  },
  component: CashierLayout,
})

function CashierLayout() {
  return <Outlet />
}
