import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { KitchenTablesPage } from '@/pages/kitchen-tables'
import type { StaffUser } from '@/entities/staff'
import { getStaffSession, logoutStaff } from '@/shared/api/auth'
import { listTables } from '@/shared/api/tables'

export const Route = createFileRoute('/kitchen/tables')({
  loader: async (): Promise<{
    user: StaffUser
    tables: Awaited<ReturnType<typeof listTables>>
  }> => {
    const session = await getStaffSession()
    if (!session) throw new Error('No session')
    const tables = await listTables()
    return { user: session, tables }
  },
  component: KitchenTablesRoute,
})

function KitchenTablesRoute() {
  const { user, tables } = Route.useLoaderData()
  const navigate = useNavigate()
  return (
    <KitchenTablesPage
      user={user}
      initialTables={tables}
      onLogout={async () => {
        await logoutStaff()
        await navigate({ to: '/kitchen/login' })
      }}
    />
  )
}
