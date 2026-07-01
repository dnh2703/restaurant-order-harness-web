import type { KitchenQueueItem, ServedItem } from '@/entities/kitchen'
import { KitchenCard } from './KitchenCard'

interface Props {
  queue: KitchenQueueItem[]
  served: ServedItem[]
  onAdvance: (id: string, status: 'COOKING' | 'SERVED') => void
}

function Column({
  title,
  count,
  empty,
  children,
}: {
  title: string
  count?: number
  empty: boolean
  children: React.ReactNode
}) {
  return (
    <section className="flex min-w-0 flex-1 flex-col gap-2">
      <h2 className="text-sm font-bold text-ink">
        {title}
        {count != null && ` (${count})`}
      </h2>
      {empty ? <p className="text-xs text-muted">Chưa có món</p> : children}
    </section>
  )
}

export function KitchenBoard({ queue, served, onAdvance }: Props) {
  const pending = queue.filter((i) => i.status === 'PENDING')
  const cooking = queue.filter((i) => i.status === 'COOKING')

  return (
    <div className="flex flex-col gap-4 md:flex-row md:gap-3">
      <Column title="Chờ làm" count={pending.length} empty={pending.length === 0}>
        {pending.map((item) => (
          <KitchenCard key={item.id} item={item} onAdvance={onAdvance} />
        ))}
      </Column>
      <Column title="Đang làm" count={cooking.length} empty={cooking.length === 0}>
        {cooking.map((item) => (
          <KitchenCard key={item.id} item={item} onAdvance={onAdvance} />
        ))}
      </Column>
      <Column title="Đã xong" empty={served.length === 0}>
        {served.map((item) => (
          <KitchenCard key={item.id} item={item} served />
        ))}
      </Column>
    </div>
  )
}
