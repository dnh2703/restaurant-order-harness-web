import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { CashierScreenPage } from '@/pages/cashier-screen'
import type { StaffUser } from '@/entities/staff'
import { logoutStaff } from '@/shared/api/auth'

export const Route = createFileRoute('/cashier/')({
  loader: ({ context }): { user: StaffUser } => {
    // Reuse the session the parent guard already fetched; bounce to login if it's gone.
    if (!context.session) throw redirect({ to: '/cashier/login' })
    return { user: context.session }
  },
  component: CashierIndex,
})

function CashierIndex() {
  const { user } = Route.useLoaderData()
  const navigate = useNavigate()
  return (
    <CashierScreenPage
      user={user}
      onLogout={async () => {
        await logoutStaff()
        await navigate({ to: '/cashier/login' })
      }}
    />
  )
}
