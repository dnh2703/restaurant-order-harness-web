import { SideNav } from '@/widgets/side-nav'
import type { StaffUser } from '@/entities/staff'
import type { AdminCategoryView, AdminMenuItemView } from '@/shared/api/menu-admin'
import { Button, Toaster } from '@/shared/ui'

interface Props {
  user: StaffUser
  initialCategories: AdminCategoryView[]
  initialMenuItems: AdminMenuItemView[]
  onLogout: () => void
}

export function KitchenMenuPage({ user, initialCategories, initialMenuItems, onLogout }: Props) {
  return (
    <div className="flex min-h-screen bg-page">
      <SideNav userName={user.name} userRole={user.role} onLogout={onLogout} activeSection="menu" />
      <main className="flex min-w-0 flex-1 flex-col gap-4 px-4 py-4 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-ink">Thực đơn</h1>
            <p className="text-sm text-muted">Quản lý danh mục, món ăn và tùy chọn gọi món.</p>
          </div>
          <Button size="sm" variant="ghost" onClick={onLogout} className="md:hidden">
            Đăng xuất
          </Button>
        </header>

        <section
          aria-label="Quản lý thực đơn"
          data-category-count={initialCategories.length}
          data-menu-item-count={initialMenuItems.length}
          className="min-h-64 rounded-panel border border-dashed border-line bg-white"
        />
      </main>
      <Toaster />
    </div>
  )
}
