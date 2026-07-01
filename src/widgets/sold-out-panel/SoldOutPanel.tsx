import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/shared/ui'
import { Button } from '@/shared/ui'
import type { KitchenMenuItem } from '@/shared/api/kitchen'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: KitchenMenuItem[]
  onToggle: (id: string, nextIsAvailable: boolean) => void
}

export function SoldOutPanel({ open, onOpenChange, items, onToggle }: Props) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Hết món</DrawerTitle>
        </DrawerHeader>
        <ul className="flex flex-col gap-2 px-4 pb-6">
          {items.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3">
              <span className={m.isAvailable ? 'text-ink' : 'text-muted line-through'}>
                {m.name}
              </span>
              <Button
                size="sm"
                variant={m.isAvailable ? 'secondary' : 'primary'}
                aria-label={m.isAvailable ? `Tạm hết ${m.name}` : `Mở lại ${m.name}`}
                onClick={() => onToggle(m.id, !m.isAvailable)}
              >
                {m.isAvailable ? 'Tạm hết' : 'Mở lại'}
              </Button>
            </li>
          ))}
        </ul>
      </DrawerContent>
    </Drawer>
  )
}
