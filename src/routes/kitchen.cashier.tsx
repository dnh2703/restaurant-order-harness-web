import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { CashierScreenPage } from '@/pages/cashier-screen'
import type { StaffUser } from '@/entities/staff'
import { logoutStaff } from '@/shared/api/auth'

export const Route = createFileRoute('/kitchen/cashier')({
  loader: ({ context }): { user: StaffUser } => {
    // Reuse the session the parent /kitchen guard already fetched.
    if (!context.session) throw redirect({ to: '/kitchen/login' })
    return { user: context.session }
  },
  component: KitchenCashier,
})

function KitchenCashier() {
  const { user } = Route.useLoaderData()
  const navigate = useNavigate()
  return (
    <CashierScreenPage
      user={user}
      onLogout={async () => {
        await logoutStaff()
        await navigate({ to: '/kitchen/login' })
      }}
    />
  )
}
