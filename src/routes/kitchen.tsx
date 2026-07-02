import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { getStaffSession } from '@/shared/api/auth'

export const Route = createFileRoute('/kitchen')({
  beforeLoad: async ({ location }) => {
    // The login route is public; everything else under /kitchen requires a session.
    if (location.pathname.startsWith('/kitchen/login')) return {}
    let session
    try {
      session = await getStaffSession()
    } catch {
      throw redirect({ to: '/kitchen/login' })
    }
    if (!session || (session.role !== 'KITCHEN' && session.role !== 'ADMIN')) {
      throw redirect({ to: '/kitchen/login' })
    }
    if (location.pathname.startsWith('/kitchen/tables') && session.role !== 'ADMIN') {
      throw redirect({ to: '/kitchen' })
    }
    return { session }
  },
  component: KitchenLayout,
})

function KitchenLayout() {
  return <Outlet />
}
