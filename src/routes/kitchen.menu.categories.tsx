import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { KitchenCategoriesPage } from '@/pages/kitchen-categories'
import type { StaffUser } from '@/entities/staff'
import { getStaffSession, logoutStaff } from '@/shared/api/auth'
import { listCategories } from '@/shared/api/menu-admin'

export const Route = createFileRoute('/kitchen/menu/categories')({
  loader: async (): Promise<{
    user: StaffUser
    categories: Awaited<ReturnType<typeof listCategories>>
  }> => {
    const [session, categories] = await Promise.all([getStaffSession(), listCategories()])
    if (!session) throw new Error('No session')
    return { user: session, categories }
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
