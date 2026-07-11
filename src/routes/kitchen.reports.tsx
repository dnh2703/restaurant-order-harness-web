import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { ReportsScreenPage } from '@/pages/reports-screen'
import type { StaffUser } from '@/entities/staff'
import { logoutStaff } from '@/shared/api/auth'

export const Route = createFileRoute('/kitchen/reports')({
  loader: ({ context }): { user: StaffUser } => {
    // Reuse the session the parent /kitchen guard already fetched.
    if (!context.session) throw redirect({ to: '/kitchen/login' })
    return { user: context.session }
  },
  component: KitchenReports,
})

function KitchenReports() {
  const { user } = Route.useLoaderData()
  const navigate = useNavigate()
  return (
    <ReportsScreenPage
      user={user}
      onLogout={async () => {
        await logoutStaff()
        await navigate({ to: '/kitchen/login' })
      }}
    />
  )
}
