import { useCallback, useState } from 'react'
import { KitchenBoard } from '@/widgets/kitchen-board'
import { SideNav } from '@/widgets/side-nav'
import { SoldOutPanel } from '@/widgets/sold-out-panel'
import { useKitchenQueue } from '@/entities/kitchen'
import type { StaffUser } from '@/entities/staff'
import { Badge, Button, Toaster, toast } from '@/shared/ui'
import {
  listMenuItemsForKitchen,
  setMenuItemAvailability,
  type KitchenMenuItem,
} from '@/shared/api/kitchen'

interface Props {
  user: StaffUser
  onLogout: () => void
}

export function KitchenScreenPage({ user, onLogout }: Props) {
  const { pending, cooking, served, mode, advance } = useKitchenQueue(user.restaurantId)
  const [panelOpen, setPanelOpen] = useState(false)
  const [menuItems, setMenuItems] = useState<KitchenMenuItem[]>([])

  const onAdvance = useCallback(
    async (id: string, status: 'COOKING' | 'SERVED') => {
      try {
        await advance(id, status)
        toast.success('Cập nhật trạng thái thành công')
      } catch {
        toast.error('Không cập nhật được món, đã hoàn tác')
      }
    },
    [advance],
  )

  const openPanel = useCallback(async () => {
    setPanelOpen(true)
    setMenuItems([])
    try {
      setMenuItems(await listMenuItemsForKitchen())
    } catch {
      toast.error('Không tải được danh sách món.')
    }
  }, [])

  const onToggleAvailability = useCallback(async (id: string, nextIsAvailable: boolean) => {
    setMenuItems((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isAvailable: nextIsAvailable } : m)),
    )
    try {
      await setMenuItemAvailability({ data: { id, isAvailable: nextIsAvailable } })
    } catch {
      setMenuItems((prev) =>
        prev.map((m) => (m.id === id ? { ...m, isAvailable: !nextIsAvailable } : m)),
      )
      toast.error('Không cập nhật được trạng thái món.')
    }
  }, [])

  return (
    <div className="flex min-h-screen bg-page">
      <SideNav
        userName={user.name}
        userRole={user.role}
        onLogout={onLogout}
        activeSection="board"
      />

      <main className="flex min-w-0 flex-1 flex-col gap-4 px-4 py-4 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-ink">Màn hình bếp</h1>
            <p className="text-sm text-muted">Đồng bộ đơn theo thời gian thực.</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={mode === 'live' ? 'brand' : 'outline'} dot>
              {mode === 'live' ? 'Trực tiếp' : 'Đang dò'}
            </Badge>
            <Button size="sm" variant="secondary" onClick={openPanel}>
              Hết món
            </Button>
            <Button size="sm" variant="ghost" onClick={onLogout} className="md:hidden">
              Đăng xuất
            </Button>
          </div>
        </header>

        <KitchenBoard pending={pending} cooking={cooking} served={served} onAdvance={onAdvance} />
      </main>

      <SoldOutPanel
        open={panelOpen}
        onOpenChange={setPanelOpen}
        items={menuItems}
        onToggle={onToggleAvailability}
      />
      <Toaster richColors position="top-right" />
    </div>
  )
}
