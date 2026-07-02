import { useState } from 'react'
import { Button, Input } from '@/shared/ui'

interface Props {
  onCreate: (input: { name: string; capacity?: number | null }) => Promise<void>
}

const fieldClass =
  'h-10 border border-line-strong bg-white px-3 shadow-none focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20'

export function CreateTableForm({ onCreate }: Props) {
  const [name, setName] = useState('')
  const [capacity, setCapacity] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    const cap = capacity.trim() === '' ? null : Number(capacity)
    if (cap !== null && (Number.isNaN(cap) || cap < 1)) return

    setBusy(true)
    try {
      await onCreate({ name: trimmed, capacity: cap })
      setName('')
      setCapacity('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-card border border-line bg-white p-4 sm:flex-row sm:items-end"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <label htmlFor="new-table-name" className="text-sm font-semibold text-ink-soft">
          Tên bàn
        </label>
        <Input
          id="new-table-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Bàn 10"
          containerClassName={fieldClass}
        />
      </div>
      <div className="flex w-full flex-col gap-1.5 sm:w-32">
        <label htmlFor="new-table-capacity" className="text-sm font-semibold text-ink-soft">
          Sức chứa
        </label>
        <Input
          id="new-table-capacity"
          type="number"
          min={1}
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          placeholder="4"
          containerClassName={fieldClass}
        />
      </div>
      <Button type="submit" disabled={busy || !name.trim()} className="sm:mb-0.5">
        {busy ? 'Đang thêm…' : 'Thêm bàn'}
      </Button>
    </form>
  )
}
