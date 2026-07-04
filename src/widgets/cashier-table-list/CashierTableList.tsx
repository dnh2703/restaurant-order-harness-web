import type { CashierTable } from '@/entities/cashier'
import { formatVND } from '@/shared/lib/format'
import { cn } from '@/shared/lib/cn'

interface Props {
  tables: CashierTable[]
  selectedOrderId: string | null
  onSelect: (orderId: string) => void
}

export function CashierTableList({ tables, selectedOrderId, onSelect }: Props) {
  if (tables.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-muted">
        Chưa có bàn nào mở
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-2 p-3">
      {tables.map((t) => (
        <li key={t.orderId}>
          <button
            type="button"
            onClick={() => onSelect(t.orderId)}
            aria-pressed={selectedOrderId === t.orderId}
            className={cn(
              'flex w-full flex-col gap-1 rounded-card border px-4 py-3 text-left transition',
              selectedOrderId === t.orderId
                ? 'border-brand bg-brand/5'
                : 'border-line-strong bg-white hover:border-brand/50',
            )}
          >
            <span className="flex items-center justify-between">
              <span className="font-semibold text-ink">{t.tableName}</span>
              <span className="font-semibold text-ink">{formatVND(t.total)}</span>
            </span>
            <span className="text-xs text-muted">{t.itemCount} món</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
