// src/widgets/dish-detail/DishDetailSheet.tsx
import { useState } from 'react'
import { Minus, Plus } from '@phosphor-icons/react'

import type { MenuItem } from '@/entities/menu/model'
import {
  type Selection,
  defaultSelection,
  toggleOption,
  selectedOptions,
  selectionPrice,
  isSelectionValid,
} from '@/entities/menu/dish-selection'
import { type CartLine, buildCartLine } from '@/entities/cart/model'
import { formatVND } from '@/shared/lib/format'
import { Drawer, DrawerContent, DrawerTitle, Button } from '@/shared/ui'

interface Props {
  item: MenuItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (line: CartLine) => void
}

export function DishDetailSheet({ item, open, onOpenChange, onAdd }: Props) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
      <DrawerContent>
        {item && (
          <DishDetailBody
            key={item.id}
            item={item}
            onAdd={(line) => {
              onAdd(line)
              onOpenChange(false)
            }}
          />
        )}
      </DrawerContent>
    </Drawer>
  )
}

function DishDetailBody({ item, onAdd }: { item: MenuItem; onAdd: (line: CartLine) => void }) {
  const [selection, setSelection] = useState<Selection>(() => defaultSelection(item))
  const [note, setNote] = useState('')
  const [quantity, setQuantity] = useState(1)

  const unitPrice = selectionPrice(item, selection)
  const valid = isSelectionValid(item, selection)

  const submit = () =>
    onAdd(buildCartLine(item, selectedOptions(item, selection), note.trim() || null, quantity))

  return (
    <div className="flex max-h-[85vh] flex-col">
      <div className="border-b border-line px-6 py-4">
        <DrawerTitle className="text-lg">{item.name}</DrawerTitle>
        {item.description && <p className="mt-1 text-sm text-muted">{item.description}</p>}
      </div>

      <div className="scrollbar-none flex-1 overflow-y-auto px-6 py-4">
        {item.optionGroups.map((group) => {
          const chosen = selection[group.id] ?? []
          return (
            <fieldset key={group.id} className="mb-5 last:mb-0">
              <legend className="mb-2 text-sm font-bold text-ink">
                {group.name}
                {group.isRequired && <span className="ml-1 text-brand">*</span>}
              </legend>
              <div className="flex flex-col gap-2">
                {group.options.map((option) => (
                  <label
                    key={option.id}
                    className="flex cursor-pointer items-center justify-between rounded-control border border-line px-3.5 py-2.5"
                  >
                    <span className="flex items-center gap-2.5 text-sm text-ink">
                      <input
                        type={group.type === 'SINGLE' ? 'radio' : 'checkbox'}
                        name={group.id}
                        checked={chosen.includes(option.id)}
                        onChange={() => setSelection((s) => toggleOption(s, group, option.id))}
                        className="size-4 accent-ink"
                      />
                      {option.name}
                    </span>
                    {option.priceDelta > 0 && (
                      <span className="text-xs font-semibold text-muted">
                        +{formatVND(option.priceDelta)}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </fieldset>
          )
        })}

        <label className="mt-1 block">
          <span className="mb-2 block text-sm font-bold text-ink">Ghi chú</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi chú cho bếp…"
            rows={2}
            className="w-full rounded-control border border-line px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-muted focus:border-line-strong"
          />
        </label>
      </div>

      <div className="flex items-center gap-3 border-t border-line px-6 py-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Giảm số lượng"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="flex size-9 items-center justify-center rounded-control bg-page text-ink"
          >
            <Minus size={16} weight="bold" />
          </button>
          <span className="w-5 text-center text-sm font-bold text-ink">{quantity}</span>
          <button
            type="button"
            aria-label="Tăng số lượng"
            onClick={() => setQuantity((q) => q + 1)}
            className="flex size-9 items-center justify-center rounded-control bg-ink text-white"
          >
            <Plus size={16} weight="bold" />
          </button>
        </div>
        <Button size="lg" fullWidth disabled={!valid} onClick={submit} className="flex-1">
          Thêm vào giỏ · {formatVND(unitPrice * quantity)}
        </Button>
      </div>
    </div>
  )
}
