import type { ReactNode } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { ForkKnifeIcon, CookingPotIcon, CheckCircleIcon } from '@phosphor-icons/react'
import type { KitchenQueueItem, ServedItem } from '@/entities/kitchen'
import { resolveDrop, type BoardColumn } from '@/entities/kitchen'
import { cn } from '@/shared/lib/cn'
import { KitchenCard } from './KitchenCard'

interface Props {
  pending: KitchenQueueItem[]
  cooking: KitchenQueueItem[]
  served: ServedItem[]
  onAdvance: (id: string, status: 'COOKING' | 'SERVED') => void
}

function DraggableCard({
  item,
  onAdvance,
}: {
  item: KitchenQueueItem
  onAdvance: Props['onAdvance']
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: { status: item.status },
  })
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn('touch-none', isDragging && 'opacity-50')}
    >
      <KitchenCard item={item} onAdvance={onAdvance} />
    </div>
  )
}

function Column({
  id,
  title,
  icon,
  count,
  accent,
  children,
}: {
  id: BoardColumn
  title: string
  icon: ReactNode
  count: number
  accent?: string
  children: ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <section
      ref={setNodeRef}
      aria-label={title}
      className={cn(
        'flex min-w-0 flex-1 flex-col gap-2 rounded-xl border border-line bg-gray-200/80 p-3',
        accent,
        isOver && 'ring-2 ring-gray-300/60',
      )}
    >
      <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
        <span className="text-secondary">{icon}</span>
        {title}
        <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-secondary">
          {count}
        </span>
      </h2>
      {count === 0 ? (
        <p className="text-xs text-muted">Chưa có món</p>
      ) : (
        <div className="flex flex-col gap-2">{children}</div>
      )}
    </section>
  )
}

export function KitchenBoard({ pending, cooking, served, onAdvance }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  )

  function onDragEnd(event: DragEndEvent) {
    if (!event.over) return
    const from = event.active.data.current?.status as KitchenQueueItem['status'] | undefined
    if (!from) return
    const next = resolveDrop(from, event.over.id as BoardColumn)
    if (next) onAdvance(String(event.active.id), next)
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start">
        <Column
          id="PENDING"
          title="Chờ làm"
          icon={<ForkKnifeIcon size={18} weight="bold" />}
          count={pending.length}
        >
          {pending.map((item) => (
            <DraggableCard key={item.id} item={item} onAdvance={onAdvance} />
          ))}
        </Column>

        <Column
          id="COOKING"
          title="Đang làm"
          icon={<CookingPotIcon size={18} weight="bold" />}
          count={cooking.length}
        >
          {cooking.map((item) => (
            <DraggableCard key={item.id} item={item} onAdvance={onAdvance} />
          ))}
        </Column>

        <Column
          id="SERVED"
          title="Đã xong"
          icon={<CheckCircleIcon size={18} weight="bold" />}
          count={served.length}
        >
          {served.map((item) => (
            <KitchenCard key={item.id} item={item} served />
          ))}
        </Column>
      </div>
    </DndContext>
  )
}
