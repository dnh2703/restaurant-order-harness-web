import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { KitchenScreenPage } from '@/pages/kitchen-screen'
import type { StaffUser } from '@/entities/staff'
import { logoutStaff } from '@/shared/api/auth'

export const Route = createFileRoute('/kitchen/')({
  loader: ({ context }): { user: StaffUser } => {
    // Reuse the session the parent guard already fetched; bounce to login if it's gone.
    if (!context.session) throw redirect({ to: '/kitchen/login' })
    return { user: context.session }
  },
  component: KitchenIndex,
})

function KitchenIndex() {
  const { user } = Route.useLoaderData()
  const navigate = useNavigate()
  return (
    <KitchenScreenPage
      user={user}
      onLogout={async () => {
        await logoutStaff()
        await navigate({ to: '/kitchen/login' })
      }}
    />
  )
}
