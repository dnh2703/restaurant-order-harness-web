import {
  BookOpenIcon,
  ChairIcon,
  ChartBarIcon,
  CookingPotIcon,
  ReceiptIcon,
  SignOutIcon,
} from '@phosphor-icons/react'
import type { StaffRole } from '@/entities/staff'
import { BrandMark, Button } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'

interface Props {
  userName: string
  userRole: StaffRole
  onLogout: () => void
  activeSection: 'board' | 'cashier' | 'tables' | 'menu' | 'reports'
}

const ROLE_LABEL: Record<StaffRole, string> = {
  ADMIN: 'Quản trị',
  KITCHEN: 'Nhân viên bếp',
  CASHIER: 'Thu ngân',
}

/** Left shell for staff routes under /kitchen. Admin sees an extra Bàn ăn tab. */
export function SideNav({ userName, userRole, onLogout, activeSection }: Props) {
  const onBoard = activeSection === 'board'
  const onCashier = activeSection === 'cashier'
  const onTables = activeSection === 'tables'
  const onMenu = activeSection === 'menu'
  const onReports = activeSection === 'reports'
  const canSeeBoard = userRole === 'KITCHEN' || userRole === 'ADMIN'
  const canSeeCashier = userRole === 'CASHIER' || userRole === 'ADMIN'

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-white px-4 py-5 md:flex">
      <BrandMark size="sm" label="Bếp Minh Châu" className="px-1" />

      <nav className="mt-6 flex flex-col gap-1">
        {canSeeBoard && (
          <a
            href="/kitchen"
            aria-current={onBoard ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2.5 rounded-control px-3 py-2 text-sm font-semibold',
              onBoard ? 'bg-brand-bg text-brand' : 'text-ink-soft hover:bg-page',
            )}
          >
            <CookingPotIcon size={18} weight="bold" />
            Bếp
          </a>
        )}
        {canSeeCashier && (
          <a
            href="/kitchen/cashier"
            aria-current={onCashier ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2.5 rounded-control px-3 py-2 text-sm font-semibold',
              onCashier ? 'bg-brand-bg text-brand' : 'text-ink-soft hover:bg-page',
            )}
          >
            <ReceiptIcon size={18} weight="bold" />
            Thu ngân
          </a>
        )}
        {userRole === 'ADMIN' && (
          <>
            <a
              href="/kitchen/tables"
              aria-current={onTables ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2.5 rounded-control px-3 py-2 text-sm font-semibold',
                onTables ? 'bg-brand-bg text-brand' : 'text-ink-soft hover:bg-page',
              )}
            >
              <ChairIcon size={18} weight="bold" />
              Bàn ăn
            </a>
            <a
              href="/kitchen/menu"
              aria-current={onMenu ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2.5 rounded-control px-3 py-2 text-sm font-semibold',
                onMenu ? 'bg-brand-bg text-brand' : 'text-ink-soft hover:bg-page',
              )}
            >
              <BookOpenIcon size={18} weight="bold" />
              Thực đơn
            </a>
            <a
              href="/kitchen/reports"
              aria-current={onReports ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2.5 rounded-control px-3 py-2 text-sm font-semibold',
                onReports ? 'bg-brand-bg text-brand' : 'text-ink-soft hover:bg-page',
              )}
            >
              <ChartBarIcon size={18} weight="bold" />
              Báo cáo
            </a>
          </>
        )}
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
