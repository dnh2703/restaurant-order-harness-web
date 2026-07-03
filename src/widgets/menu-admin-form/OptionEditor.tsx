import { useEffect, useState } from 'react'
import type {
  AdminOptionGroupView,
  AdminOptionView,
  OptionGroupType,
  SaveOptionGroupInput,
  SaveOptionInput,
} from '@/shared/api/menu-admin'
import { Badge, Button, Input, Select } from '@/shared/ui'

interface Props {
  menuItemId: string | null
  groups: AdminOptionGroupView[]
  /** Show a skeleton while the initial option groups load. */
  loading?: boolean
  onCreateGroup: (input: SaveOptionGroupInput) => Promise<void>
  onUpdateGroup: (groupId: string, input: Partial<SaveOptionGroupInput>) => Promise<void>
  onDeleteGroup: (groupId: string) => Promise<void>
  onCreateOption: (groupId: string, input: SaveOptionInput) => Promise<void>
  onUpdateOption: (
    groupId: string,
    optionId: string,
    input: Partial<SaveOptionInput>,
  ) => Promise<void>
  onDeleteOption: (groupId: string, optionId: string) => Promise<void>
}

const fieldClass =
  'h-10 border border-line-strong bg-white px-3 shadow-none focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20'

const typeOptions = [
  { value: 'SINGLE', label: 'Chọn một' },
  { value: 'MULTI', label: 'Chọn nhiều' },
]

function parseNumberOrZero(value: string): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const skeletonBlock = 'animate-pulse rounded-control bg-black/[0.06]'

function GroupSkeleton() {
  return (
    <div
      aria-hidden
      className="flex flex-col gap-3 rounded-card border border-line-strong bg-white p-3"
    >
      <div className="grid gap-2 sm:grid-cols-[1fr_10rem_auto]">
        <div className={`h-10 ${skeletonBlock}`} />
        <div className={`h-10 ${skeletonBlock}`} />
        <div className={`h-10 w-28 ${skeletonBlock}`} />
      </div>
      <div className={`h-4 w-24 ${skeletonBlock}`} />
      <div className={`h-10 ${skeletonBlock}`} />
    </div>
  )
}

function OptionEditorSkeleton() {
  return (
    <div className="flex flex-col gap-3" role="status" aria-live="polite">
      <span className="sr-only">Đang tải tùy chọn…</span>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-ink-soft">Tùy chọn món</span>
        <div className={`h-6 w-16 ${skeletonBlock}`} aria-hidden />
      </div>
      <GroupSkeleton />
      <GroupSkeleton />
    </div>
  )
}

function OptionRow({
  option,
  onUpdate,
  onDelete,
}: {
  option: AdminOptionView
  onUpdate: (input: Partial<SaveOptionInput>) => Promise<void>
  onDelete: () => Promise<void>
}) {
  const [name, setName] = useState(option.name)
  const [priceDelta, setPriceDelta] = useState(String(option.priceDelta))
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setName(option.name)
    setPriceDelta(String(option.priceDelta))
  }, [option.name, option.priceDelta])

  async function run(fn: () => Promise<void>) {
    if (busy) return
    setBusy(true)
    try {
      await fn()
    } catch {
      // Parent owns toast/error display.
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      role="group"
      aria-label={`Tùy chọn ${option.name}`}
      className="grid gap-2 sm:grid-cols-[1fr_9rem_auto]"
    >
      <Input
        aria-label="Tên tùy chọn"
        value={name}
        onChange={(e) => setName(e.target.value)}
        containerClassName={fieldClass}
        disabled={busy}
      />
      <Input
        aria-label="Giá thêm"
        type="number"
        value={priceDelta}
        onChange={(e) => setPriceDelta(e.target.value)}
        containerClassName={fieldClass}
        disabled={busy}
      />
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() =>
            run(() => onUpdate({ name: name.trim(), priceDelta: parseNumberOrZero(priceDelta) }))
          }
        >
          Lưu
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-red-600 hover:bg-red-50 hover:text-red-700"
          disabled={busy}
          onClick={() => run(onDelete)}
        >
          Xóa
        </Button>
      </div>
    </div>
  )
}

function GroupCard({
  group,
  onUpdateGroup,
  onDeleteGroup,
  onCreateOption,
  onUpdateOption,
  onDeleteOption,
}: {
  group: AdminOptionGroupView
  onUpdateGroup: (input: Partial<SaveOptionGroupInput>) => Promise<void>
  onDeleteGroup: () => Promise<void>
  onCreateOption: (input: SaveOptionInput) => Promise<void>
  onUpdateOption: (optionId: string, input: Partial<SaveOptionInput>) => Promise<void>
  onDeleteOption: (optionId: string) => Promise<void>
}) {
  const [name, setName] = useState(group.name)
  const [type, setType] = useState<OptionGroupType>(group.type)
  const [isRequired, setIsRequired] = useState(group.isRequired)
  const [busy, setBusy] = useState(false)

  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    setName(group.name)
    setType(group.type)
    setIsRequired(group.isRequired)
  }, [group.name, group.type, group.isRequired])

  async function run(setFlag: (v: boolean) => void, flag: boolean, fn: () => Promise<void>) {
    if (flag) return
    setFlag(true)
    try {
      await fn()
    } catch {
      // Parent owns toast/error display.
    } finally {
      setFlag(false)
    }
  }

  async function handleAddOption() {
    const trimmed = newName.trim()
    if (!trimmed) return
    await run(setAdding, adding, async () => {
      await onCreateOption({ name: trimmed, priceDelta: parseNumberOrZero(newPrice) })
      setNewName('')
      setNewPrice('')
    })
  }

  return (
    <section
      aria-label={`Nhóm ${group.name}`}
      className="flex flex-col gap-3 rounded-card border border-line-strong bg-white p-3"
    >
      <div className="grid gap-2 sm:grid-cols-[1fr_10rem_auto]">
        <Input
          aria-label="Tên nhóm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          containerClassName={fieldClass}
          disabled={busy}
        />
        <Select
          ariaLabel="Loại nhóm"
          value={type}
          onValueChange={(v) => setType(v as OptionGroupType)}
          disabled={busy}
          className="h-10"
          options={typeOptions}
        />
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() =>
              run(setBusy, busy, () => onUpdateGroup({ name: name.trim(), type, isRequired }))
            }
          >
            Lưu nhóm
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
            disabled={busy}
            onClick={() => run(setBusy, busy, onDeleteGroup)}
          >
            Xóa nhóm
          </Button>
        </div>
      </div>

      <label className="flex w-fit items-center gap-2 text-sm font-semibold text-ink">
        <input
          type="checkbox"
          checked={isRequired}
          onChange={(e) => setIsRequired(e.target.checked)}
          className="h-4 w-4 accent-brand"
          disabled={busy}
        />
        Bắt buộc
      </label>

      <div className="flex flex-col gap-2">
        {group.options.map((option) => (
          <OptionRow
            key={option.id}
            option={option}
            onUpdate={(input) => onUpdateOption(option.id, input)}
            onDelete={() => onDeleteOption(option.id)}
          />
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_9rem_auto]">
        <Input
          aria-label="Tên tùy chọn mới"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nhỏ"
          containerClassName={fieldClass}
          disabled={adding}
        />
        <Input
          aria-label="Giá thêm mới"
          type="number"
          value={newPrice}
          onChange={(e) => setNewPrice(e.target.value)}
          placeholder="0"
          containerClassName={fieldClass}
          disabled={adding}
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={adding || !newName.trim()}
          onClick={handleAddOption}
        >
          Thêm tùy chọn
        </Button>
      </div>
    </section>
  )
}

export function OptionEditor({
  menuItemId,
  groups,
  loading,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
  onCreateOption,
  onUpdateOption,
  onDeleteOption,
}: Props) {
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<OptionGroupType>('SINGLE')
  const [newRequired, setNewRequired] = useState(false)
  const [creating, setCreating] = useState(false)

  if (menuItemId === null) {
    return (
      <div className="rounded-card border border-dashed border-line-strong bg-page px-3 py-4 text-sm font-semibold text-muted">
        Lưu món trước khi thêm tùy chọn.
      </div>
    )
  }

  if (loading) {
    return <OptionEditorSkeleton />
  }

  async function handleCreateGroup() {
    const trimmed = newName.trim()
    if (!trimmed || creating) return
    setCreating(true)
    try {
      await onCreateGroup({ name: trimmed, type: newType, isRequired: newRequired })
      setNewName('')
      setNewType('SINGLE')
      setNewRequired(false)
    } catch {
      // Parent owns toast/error display.
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-ink-soft">Tùy chọn món</span>
        <Badge variant="outline">{groups.length} nhóm</Badge>
      </div>

      {groups.map((group) => (
        <GroupCard
          key={group.id}
          group={group}
          onUpdateGroup={(input) => onUpdateGroup(group.id, input)}
          onDeleteGroup={() => onDeleteGroup(group.id)}
          onCreateOption={(input) => onCreateOption(group.id, input)}
          onUpdateOption={(optionId, input) => onUpdateOption(group.id, optionId, input)}
          onDeleteOption={(optionId) => onDeleteOption(group.id, optionId)}
        />
      ))}

      <div className="flex flex-col gap-2 rounded-card border border-dashed border-line-strong bg-page p-3">
        <div className="grid gap-2 sm:grid-cols-[1fr_10rem_auto]">
          <Input
            aria-label="Tên nhóm mới"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Size"
            containerClassName={fieldClass}
            disabled={creating}
          />
          <Select
            ariaLabel="Loại nhóm mới"
            value={newType}
            onValueChange={(v) => setNewType(v as OptionGroupType)}
            disabled={creating}
            className="h-10"
            options={typeOptions}
          />
          <Button
            type="button"
            size="sm"
            disabled={creating || !newName.trim()}
            onClick={handleCreateGroup}
          >
            Thêm nhóm
          </Button>
        </div>
        <label className="flex w-fit items-center gap-2 text-sm font-semibold text-ink">
          <input
            type="checkbox"
            checked={newRequired}
            onChange={(e) => setNewRequired(e.target.checked)}
            className="h-4 w-4 accent-brand"
            disabled={creating}
          />
          Bắt buộc
        </label>
      </div>
    </div>
  )
}
