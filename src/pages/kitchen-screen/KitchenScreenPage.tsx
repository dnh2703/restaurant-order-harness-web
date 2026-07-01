import { useCallback, useState } from 'react'
import { Badge, Button } from '@/shared/ui'
import { KitchenBoard } from '@/widgets/kitchen-board/KitchenBoard'
import { SoldOutPanel } from '@/widgets/sold-out-panel/SoldOutPanel'
import { useKitchenStream } from '@/entities/kitchen/useKitchenStream'
import {
  advanceOrderItemStatus,
  listMenuItemsForKitchen,
  setMenuItemAvailability,
  type KitchenMenuItem,
} from '@/shared/api/kitchen'
import type { StaffUser } from '@/entities/staff/model'

interface Props {
  user: StaffUser
  onLogout: () => void
}

export function KitchenScreenPage({ user, onLogout }: Props) {
  const { queue, served, mode, refetch } = useKitchenStream(user.restaurantId)
  const [toast, setToast] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [menuItems, setMenuItems] = useState<KitchenMenuItem[]>([])

  const onAdvance = useCallback(
    async (id: string, status: 'COOKING' | 'SERVED') => {
      setToast(null)
      try {
        await advanceOrderItemStatus({ data: { id, status } })
        refetch()
      } catch {
        setToast('Không cập nhật được món, thử lại.')
        refetch()
      }
    },
    [refetch],
  )

  const openPanel = useCallback(async () => {
    setPanelOpen(true)
    setMenuItems([])
    try {
      setMenuItems(await listMenuItemsForKitchen())
    } catch {
      setToast('Không tải được danh sách món.')
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
      setToast('Không cập nhật được trạng thái món.')
    }
  }, [])

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 px-4 py-4">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-ink">Màn hình bếp</h1>
        <div className="flex items-center gap-2">
          <Badge variant={mode === 'live' ? 'brand' : 'outline'} dot>
            {mode === 'live' ? 'Trực tiếp' : 'Đang dò'}
          </Badge>
          <Button size="sm" variant="secondary" onClick={openPanel}>
            Hết món
          </Button>
          <Button size="sm" variant="ghost" onClick={onLogout}>
            Đăng xuất
          </Button>
        </div>
      </header>

      {toast && <p className="rounded-control bg-red-50 px-3 py-2 text-sm text-red-700">{toast}</p>}

      <KitchenBoard queue={queue} served={served} onAdvance={onAdvance} />

      <SoldOutPanel
        open={panelOpen}
        onOpenChange={setPanelOpen}
        items={menuItems}
        onToggle={onToggleAvailability}
      />
    </main>
  )
}
