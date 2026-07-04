import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { KitchenTablesPage } from '@/pages/kitchen-tables'
import type { StaffUser } from '@/entities/staff'
import { logoutStaff } from '@/shared/api/auth'
import { listTables } from '@/shared/api/tables'
import { withKitchenAuth } from '@/shared/lib/kitchen-auth'

export const Route = createFileRoute('/kitchen/tables')({
  loader: async ({
    context,
  }): Promise<{
    user: StaffUser
    tables: Awaited<ReturnType<typeof listTables>>
  }> => {
    if (!context.session) throw redirect({ to: '/kitchen/login' })
    const tables = await withKitchenAuth(() => listTables())
    return { user: context.session, tables }
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
