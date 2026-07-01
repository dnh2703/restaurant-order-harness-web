import { ChefHatIcon, CookingPotIcon, SignOutIcon } from '@phosphor-icons/react'
import type { StaffRole } from '@/entities/staff'
import { Button } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'

interface Props {
  userName: string
  userRole: StaffRole
  onLogout: () => void
}

const ROLE_LABEL: Record<StaffRole, string> = {
  ADMIN: 'Quản trị',
  KITCHEN: 'Nhân viên bếp',
  CASHIER: 'Thu ngân',
}

/** Left shell for the kitchen app. Only the (active) "Bếp" tab exists today. */
export function SideNav({ userName, userRole, onLogout }: Props) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-white px-4 py-5 md:flex">
      <div className="flex items-center gap-2.5 px-1">
        <div className="flex size-9 items-center justify-center rounded-control bg-brand text-white">
          <ChefHatIcon size={20} weight="fill" />
        </div>
        <span className="text-base font-extrabold tracking-tight text-ink">Nhà bếp</span>
      </div>

      <nav className="mt-6 flex flex-col gap-1">
        <a
          href="/kitchen"
          aria-current="page"
          className={cn(
            'flex items-center gap-2.5 rounded-control px-3 py-2 text-sm font-semibold',
            'bg-brand-bg text-brand',
          )}
        >
          <CookingPotIcon size={18} weight="bold" />
          Bếp
        </a>
      </nav>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-ink">{userName}</p>
          <p className="truncate text-xs text-muted">{ROLE_LABEL[userRole]}</p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={onLogout}
          aria-label="Đăng xuất"
          className="shrink-0"
        >
          <SignOutIcon size={16} weight="bold" />
        </Button>
      </div>
    </aside>
  )
}
