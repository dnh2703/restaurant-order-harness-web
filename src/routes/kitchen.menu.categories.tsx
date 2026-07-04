import { createFileRoute, redirect, useNavigate, useRouter } from '@tanstack/react-router'
import { KitchenCategoriesPage } from '@/pages/kitchen-categories'
import type { StaffUser } from '@/entities/staff'
import { logoutStaff } from '@/shared/api/auth'
import { listCategories } from '@/shared/api/menu-admin'
import { withKitchenAuth } from '@/shared/lib/kitchen-auth'

export const Route = createFileRoute('/kitchen/menu/categories')({
  loader: async ({
    context,
  }): Promise<{
    user: StaffUser
    categories: Awaited<ReturnType<typeof listCategories>>
  }> => {
    if (!context.session) throw redirect({ to: '/kitchen/login' })
    const categories = await withKitchenAuth(() => listCategories())
    return { user: context.session, categories }
  },
  component: KitchenCategoriesRoute,
})

function KitchenCategoriesRoute() {
  const { user, categories } = Route.useLoaderData()
  const navigate = useNavigate()
  const router = useRouter()
  return (
    <KitchenCategoriesPage
      user={user}
      initialCategories={categories}
      onChanged={() => router.invalidate()}
      onBack={() => navigate({ to: '/kitchen/menu' })}
      onLogout={async () => {
        await logoutStaff()
        await navigate({ to: '/kitchen/login' })
      }}
    />
  )
}
