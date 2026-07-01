import { Button } from '@/shared/ui'
import type { KitchenQueueItem, ServedItem } from '@/entities/kitchen/model'

interface QueueProps {
  item: KitchenQueueItem
  onAdvance: (id: string, status: 'COOKING' | 'SERVED') => void
}

interface ServedProps {
  item: ServedItem
  served: true
}

type Props = QueueProps | ServedProps

/** Minutes elapsed since an ISO timestamp, clamped to >= 0. */
function minutesSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime()
  return Math.max(0, Math.floor(ms / 60000))
}

function elapsedClass(minutes: number): string {
  if (minutes >= 15) return 'text-red-600'
  if (minutes >= 8) return 'text-orange-600'
  return 'text-muted'
}

export function KitchenCard(props: Props) {
  const { item } = props
  const isServed = 'served' in props
  const timestamp = isServed ? (item as ServedItem).servedAt : (item as KitchenQueueItem).createdAt
  const minutes = minutesSince(timestamp)

  return (
    <article className="rounded-control border border-line-strong bg-white p-3">
      <header className="flex items-center justify-between">
        <span className="font-bold text-ink">{item.tableName}</span>
        <span className={elapsedClass(minutes)}>{minutes}′</span>
      </header>
      <p className="mt-1 text-sm text-ink">
        {item.nameSnapshot} <span className="font-semibold">× {item.quantity}</span>
      </p>
      {item.options.length > 0 && (
        <p className="text-xs text-secondary">
          {item.options.map((o) => `+${o.optionName}`).join(', ')}
        </p>
      )}
      {item.note && <p className="text-xs italic text-secondary">"{item.note}"</p>}
      {!isServed && (
        <div className="mt-2">
          {(item as KitchenQueueItem).status === 'PENDING' ? (
            <Button
              size="sm"
              fullWidth
              onClick={() => (props as QueueProps).onAdvance(item.id, 'COOKING')}
            >
              Bắt đầu
            </Button>
          ) : (
            <Button
              size="sm"
              fullWidth
              onClick={() => (props as QueueProps).onAdvance(item.id, 'SERVED')}
            >
              Xong →
            </Button>
          )}
        </div>
      )}
      {isServed && <p className="mt-2 text-xs font-semibold text-green-700">✓ Đã phục vụ</p>}
    </article>
  )
}
