import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import type { StaffUser } from '@/entities/staff'
import { getStaffSession } from '@/shared/api/auth'

type KitchenLanding = '/kitchen' | '/kitchen/cashier'
type KitchenAccess =
  { allow: true } | { allow: false; redirectTo: '/kitchen/login' | KitchenLanding }

/** Where a signed-in staff member lands in the /kitchen area, by role. */
export function kitchenLandingForRole(role: StaffUser['role']): KitchenLanding {
  return role === 'CASHIER' ? '/kitchen/cashier' : '/kitchen'
}

export function resolveKitchenAccess(pathname: string, session: StaffUser | null): KitchenAccess {
  if (pathname === '/kitchen/login') return { allow: true }
  if (!session) return { allow: false, redirectTo: '/kitchen/login' }

  // A forbidden route bounces the user to their own home to avoid multi-hop redirects.
  const home = kitchenLandingForRole(session.role)
  const isCashierRoute = pathname.startsWith('/kitchen/cashier')
  const isAdminRoute =
    pathname.startsWith('/kitchen/tables') ||
    pathname.startsWith('/kitchen/menu') ||
    pathname.startsWith('/kitchen/reports')

  if (isCashierRoute) {
    if (session.role === 'CASHIER' || session.role === 'ADMIN') return { allow: true }
    return { allow: false, redirectTo: home }
  }
  if (isAdminRoute) {
    if (session.role === 'ADMIN') return { allow: true }
    return { allow: false, redirectTo: home }
  }
  // The kitchen board (/kitchen) and any other sub-route: kitchen staff + admin.
  if (session.role === 'KITCHEN' || session.role === 'ADMIN') return { allow: true }
  return { allow: false, redirectTo: home }
}

export const Route = createFileRoute('/kitchen')({
  beforeLoad: async ({ location }): Promise<{ session: StaffUser | null }> => {
    // The login route is public; everything else under /kitchen requires a session.
    if (location.pathname === '/kitchen/login') return { session: null }
    let session
    try {
      session = await getStaffSession()
    } catch {
      throw redirect({ to: '/kitchen/login' })
    }

    const access = resolveKitchenAccess(location.pathname, session)
    if (!access.allow) {
      throw redirect({ to: access.redirectTo })
    }
    // Child loaders reuse this session instead of re-fetching it — one auth round-trip per
    // navigation, avoiding a second token refresh that would rotate the refresh token again.
    return { session }
  },
  component: KitchenLayout,
})

function KitchenLayout() {
  return <Outlet />
}
