import { ClockIcon, CheckCircleIcon } from '@phosphor-icons/react'
import type { KitchenQueueItem, ServedItem } from '@/entities/kitchen'
import { Button } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'

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

/** Local clock time (HH:mm) for an ISO timestamp — e.g. when the customer ordered. */
function formatTime(iso: string): string {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

export function KitchenCard(props: Props) {
  const { item } = props
  const isServed = 'served' in props
  const timestamp = isServed ? (item as ServedItem).servedAt : (item as KitchenQueueItem).createdAt
  const minutes = minutesSince(timestamp)

  return (
    <article
      className={cn(
        'rounded-control border bg-white p-3',
        isServed ? 'border-line opacity-70' : 'border-line-strong shadow-sm',
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'inline-flex items-center gap-1 text-xs font-semibold',
            isServed ? 'text-green-700' : elapsedClass(minutes),
          )}
        >
          {isServed ? (
            <CheckCircleIcon size={14} weight="fill" />
          ) : (
            <ClockIcon size={14} weight="bold" />
          )}
          {formatTime(timestamp)}
        </span>
      </div>

      <p className={cn('mt-0.5 font-bold text-ink', isServed && 'line-through')}>
        {item.tableName}
      </p>
      <div className="mt-1 flex items-start justify-between gap-2">
        <p className={cn('text-sm font-medium text-ink', isServed && 'text-muted line-through')}>
          {item.nameSnapshot}
        </p>
        <span
          className={cn(
            'shrink-0 rounded-md px-1.5 py-0.5 text-xs font-bold tabular-nums',
            isServed ? 'bg-line text-muted' : 'bg-brand-bg text-brand',
          )}
        >
          ×{item.quantity}
        </span>
      </div>
      {item.options.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {item.options.map((o, i) => (
            <span
              key={`${o.optionName}-${i}`}
              className="rounded-md bg-page px-1.5 py-0.5 text-[11px] font-medium text-secondary"
            >
              {o.optionName}
            </span>
          ))}
        </div>
      )}
      {item.note && (
        <p className="mt-1.5 rounded-md border-l-2 border-line-strong bg-page px-2 py-1 text-xs italic text-secondary">
          {item.note}
        </p>
      )}

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
              Hoàn thành
            </Button>
          )}
        </div>
      )}
    </article>
  )
}
