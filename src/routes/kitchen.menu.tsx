import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { KitchenMenuPage } from '@/pages/kitchen-menu'
import type { StaffUser } from '@/entities/staff'
import { getStaffSession, logoutStaff } from '@/shared/api/auth'
import { listCategories, listMenuItems } from '@/shared/api/menu-admin'

export const Route = createFileRoute('/kitchen/menu')({
  loader: async (): Promise<{
    user: StaffUser
    categories: Awaited<ReturnType<typeof listCategories>>
    menuItems: Awaited<ReturnType<typeof listMenuItems>>
  }> => {
    const [session, categories, menuItems] = await Promise.all([
      getStaffSession(),
      listCategories(),
      listMenuItems(),
    ])
    if (!session) throw new Error('No session')
    return { user: session, categories, menuItems }
  },
  component: KitchenMenuRoute,
})

function KitchenMenuRoute() {
  const { user, categories, menuItems } = Route.useLoaderData()
  const navigate = useNavigate()
  return (
    <KitchenMenuPage
      user={user}
      initialCategories={categories}
      initialMenuItems={menuItems}
      onLogout={async () => {
        await logoutStaff()
        await navigate({ to: '/kitchen/login' })
      }}
    />
  )
}
