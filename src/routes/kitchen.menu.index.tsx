import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { KitchenMenuPage } from '@/pages/kitchen-menu'
import type { StaffUser } from '@/entities/staff'
import { logoutStaff } from '@/shared/api/auth'
import { listCategories, listMenuItems } from '@/shared/api/menu-admin'
import { withKitchenAuth } from '@/shared/lib/kitchen-auth'

export const Route = createFileRoute('/kitchen/menu/')({
  loader: async ({
    context,
  }): Promise<{
    user: StaffUser
    categories: Awaited<ReturnType<typeof listCategories>>
    menuItems: Awaited<ReturnType<typeof listMenuItems>>
  }> => {
    // Reuse the parent guard's session; if a data call still hits an expired session, bounce
    // to login rather than surfacing the router's generic error boundary.
    if (!context.session) throw redirect({ to: '/kitchen/login' })
    const [categories, menuItems] = await withKitchenAuth(() =>
      Promise.all([listCategories(), listMenuItems()]),
    )
    return { user: context.session, categories, menuItems }
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
      onManageCategories={() => navigate({ to: '/kitchen/menu/categories' })}
      onLogout={async () => {
        await logoutStaff()
        await navigate({ to: '/kitchen/login' })
      }}
    />
  )
}
