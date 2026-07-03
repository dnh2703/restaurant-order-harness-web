import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import type { StaffUser } from '@/entities/staff'
import { getStaffSession } from '@/shared/api/auth'

type KitchenAccess = { allow: true } | { allow: false; redirectTo: '/kitchen/login' | '/kitchen' }

export function resolveKitchenAccess(pathname: string, session: StaffUser | null): KitchenAccess {
  if (pathname === '/kitchen/login') return { allow: true }
  if (!session || (session.role !== 'KITCHEN' && session.role !== 'ADMIN')) {
    return { allow: false, redirectTo: '/kitchen/login' }
  }
  const adminOnlyRoute =
    pathname.startsWith('/kitchen/tables') || pathname.startsWith('/kitchen/menu')
  if (adminOnlyRoute && session.role !== 'ADMIN') {
    return { allow: false, redirectTo: '/kitchen' }
  }
  return { allow: true }
}

export const Route = createFileRoute('/kitchen')({
  beforeLoad: async ({ location }) => {
    // The login route is public; everything else under /kitchen requires a session.
    if (location.pathname === '/kitchen/login') return {}
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
    return { session }
  },
  component: KitchenLayout,
})

function KitchenLayout() {
  return <Outlet />
}
