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
        <span className="text-[10px] font-bold uppercase tracking-wide text-brand">Tại bàn</span>
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
          {isServed ? `${minutes} phút trước` : `${minutes}′`}
        </span>
      </div>

      <p className={cn('mt-0.5 font-bold text-ink', isServed && 'line-through')}>
        {item.tableName}
      </p>
      <p className={cn('mt-1 text-sm text-ink', isServed && 'text-muted line-through')}>
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
              Hoàn thành
            </Button>
          )}
        </div>
      )}
    </article>
  )
}
