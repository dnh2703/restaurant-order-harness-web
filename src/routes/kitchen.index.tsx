import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { KitchenScreenPage } from '@/pages/kitchen-screen/KitchenScreenPage'
import { getStaffSession, logoutStaff } from '@/shared/api/auth'
import type { StaffUser } from '@/entities/staff/model'

export const Route = createFileRoute('/kitchen/')({
  loader: async (): Promise<{ user: StaffUser }> => {
    const session = await getStaffSession()
    // The parent guard already redirected unauthenticated users; assert for types.
    if (!session) throw new Error('No session')
    return { user: session }
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
