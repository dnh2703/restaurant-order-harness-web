import { useEffect, useMemo, useState } from 'react'
import type {
  AdminCategoryView,
  AdminMenuItemView,
  AdminOptionGroupView,
  SaveMenuItemInput,
  SaveOptionGroupInput,
  SaveOptionInput,
} from '@/shared/api/menu-admin'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
} from '@/shared/ui'
import { cn } from '@/shared/lib/cn'
import { OptionEditor } from './OptionEditor'
import { IMAGE_ACCEPT_ATTR, validateImageFile } from './image-upload'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: AdminCategoryView[]
  item: AdminMenuItemView | null
  onSave: (
    input: SaveMenuItemInput | (Partial<SaveMenuItemInput> & { id: string }),
  ) => Promise<void>
  onUploadImage: (file: File) => Promise<string>
  optionGroups: AdminOptionGroupView[]
  optionGroupsLoading?: boolean
  onCreateGroup: (menuItemId: string, input: SaveOptionGroupInput) => Promise<void>
  onUpdateGroup: (
    menuItemId: string,
    groupId: string,
    input: Partial<SaveOptionGroupInput>,
  ) => Promise<void>
  onDeleteGroup: (menuItemId: string, groupId: string) => Promise<void>
  onCreateOption: (menuItemId: string, groupId: string, input: SaveOptionInput) => Promise<void>
  onUpdateOption: (
    menuItemId: string,
    groupId: string,
    optionId: string,
    input: Partial<SaveOptionInput>,
  ) => Promise<void>
  onDeleteOption: (menuItemId: string, groupId: string, optionId: string) => Promise<void>
}

const fieldClass =
  'h-10 border border-line-strong bg-white px-3 shadow-none focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20'

function sortCategories(categories: AdminCategoryView[]) {
  return [...categories].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'vi'),
  )
}

function parseNumberOrZero(value: string): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function trimNullable(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function MenuItemDialog({
  open,
  onOpenChange,
  categories,
  item,
  onSave,
  onUploadImage,
  optionGroups,
  optionGroupsLoading,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
  onCreateOption,
  onUpdateOption,
  onDeleteOption,
}: Props) {
  const menuItemId = item?.id ?? null
  const sortedCategories = useMemo(() => sortCategories(categories), [categories])
  const [categoryId, setCategoryId] = useState('')
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [isAvailable, setIsAvailable] = useState(true)
  const [sortOrder, setSortOrder] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [showUrlInput, setShowUrlInput] = useState(false)

  useEffect(() => {
    if (!open) return
    setCategoryId(item?.categoryId ?? sortedCategories[0]?.id ?? '')
    setName(item?.name ?? '')
    setPrice(item ? String(item.price) : '')
    setDescription(item?.description ?? '')
    setImageUrl(item?.imageUrl ?? '')
    setIsAvailable(item?.isAvailable ?? true)
    setSortOrder(item ? String(item.sortOrder) : '')
    setSaving(false)
    setUploading(false)
    setUploadError(null)
    setShowUrlInput(false)
  }, [item, open, sortedCategories])

  const hasCategories = sortedCategories.length > 0
  const trimmedName = name.trim()
  const previewUrl = imageUrl.trim()
  const title = item ? 'Sửa món' : 'Thêm món'

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // Reset so re-picking the same file still fires onChange.
    e.target.value = ''
    if (!file) return

    const validationError = validateImageFile(file)
    if (validationError) {
      setUploadError(validationError)
      return
    }

    setUploadError(null)
    setUploading(true)
    try {
      const url = await onUploadImage(file)
      setImageUrl(url)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Tải ảnh thất bại')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving || uploading || !hasCategories || !trimmedName) return

    const fields: SaveMenuItemInput = {
      categoryId,
      name: trimmedName,
      price: parseNumberOrZero(price),
      description: trimNullable(description),
      imageUrl: trimNullable(imageUrl),
      isAvailable,
      sortOrder: parseNumberOrZero(sortOrder),
    }

    setSaving(true)
    try {
      await onSave(item ? { id: item.id, ...fields } : fields)
      onOpenChange(false)
    } catch {
      // Parent owns toast/error display; keep draft open for correction.
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!saving) onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Nhập thông tin món ăn. Tùy chọn món sẽ được cấu hình ở bước sau.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!hasCategories ? (
            <div className="rounded-card border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
              Cần tạo danh mục trước khi thêm món.
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="menu-item-image" className="text-sm font-semibold text-ink-soft">
              Ảnh món
            </label>
            <div className="flex flex-col items-center gap-2">
              <label
                htmlFor="menu-item-image"
                className={cn(
                  'group flex flex-col items-center gap-2',
                  saving || uploading ? 'cursor-not-allowed' : 'cursor-pointer',
                )}
              >
                <span
                  className={cn(
                    'relative flex h-[180px] w-80 shrink-0 items-center justify-center overflow-hidden rounded-card border border-line-strong bg-surface-muted transition group-hover:border-brand',
                    (saving || uploading) && 'opacity-70',
                  )}
                >
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Xem trước ảnh món"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-9 w-9 text-ink-muted"
                      aria-hidden="true"
                    >
                      <rect x="3" y="4" width="18" height="16" rx="2" />
                      <circle cx="8.5" cy="9.5" r="1.5" />
                      <path d="m21 16-4.5-4.5L5 20" />
                    </svg>
                  )}
                  {uploading ? (
                    <span className="absolute inset-0 flex items-center justify-center bg-ink/50">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className="h-6 w-6 animate-spin text-white"
                        aria-hidden="true"
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="9"
                          stroke="currentColor"
                          strokeWidth="3"
                          opacity="0.25"
                        />
                        <path
                          d="M21 12a9 9 0 0 0-9-9"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                  ) : (
                    <span className="pointer-events-none absolute inset-0 hidden items-center justify-center bg-ink/40 text-xs font-semibold text-white group-hover:flex">
                      Đổi ảnh
                    </span>
                  )}
                </span>
                <span className="text-sm font-semibold text-brand group-hover:underline">
                  {uploading ? 'Đang tải ảnh lên…' : 'Nhấn để đổi ảnh món'}
                </span>
              </label>
              <input
                id="menu-item-image"
                name="menuItemImage"
                type="file"
                accept={IMAGE_ACCEPT_ATTR}
                aria-label="Ảnh món"
                onChange={handleFileChange}
                disabled={saving || uploading}
                className="sr-only"
              />
              <p className="text-xs text-ink-muted">JPEG, PNG hoặc WebP · tối đa 5 MB</p>
              {uploadError ? (
                <p role="alert" className="text-xs font-semibold text-red-600">
                  {uploadError}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => setShowUrlInput((prev) => !prev)}
                disabled={saving}
                className="text-xs font-semibold text-brand underline-offset-2 hover:underline disabled:opacity-60"
              >
                {showUrlInput ? 'Ẩn link ảnh ngoài' : 'Dán link ảnh ngoài'}
              </button>
              {showUrlInput ? (
                <div className="flex w-full flex-col gap-1.5">
                  <label htmlFor="menu-item-image-url" className="sr-only">
                    Link ảnh ngoài
                  </label>
                  <Input
                    id="menu-item-image-url"
                    name="menuItemImageUrl"
                    autoComplete="off"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                    containerClassName={fieldClass}
                    disabled={saving}
                  />
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_14rem]">
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor="menu-item-name" className="text-sm font-semibold text-ink-soft">
                Tên món
              </label>
              <Input
                id="menu-item-name"
                name="menuItemName"
                autoComplete="off"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Phở bò"
                containerClassName={fieldClass}
                disabled={saving}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor="menu-item-category" className="text-sm font-semibold text-ink-soft">
                Danh mục
              </label>
              <Select
                triggerId="menu-item-category"
                ariaLabel="Danh mục"
                value={categoryId}
                onValueChange={setCategoryId}
                disabled={saving || !hasCategories}
                className="h-10 focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20"
                options={sortedCategories.map((category) => ({
                  value: category.id,
                  label: category.name,
                }))}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor="menu-item-price" className="text-sm font-semibold text-ink-soft">
                Giá
              </label>
              <Input
                id="menu-item-price"
                name="menuItemPrice"
                autoComplete="off"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="50000"
                containerClassName={fieldClass}
                disabled={saving}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor="menu-item-sort-order" className="text-sm font-semibold text-ink-soft">
                Thứ tự
              </label>
              <Input
                id="menu-item-sort-order"
                name="menuItemSortOrder"
                autoComplete="off"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                placeholder="1"
                containerClassName={fieldClass}
                disabled={saving}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="menu-item-description" className="text-sm font-semibold text-ink-soft">
              Mô tả
            </label>
            <textarea
              id="menu-item-description"
              name="menuItemDescription"
              autoComplete="off"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-24 rounded-control border border-line-strong bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              placeholder="Mô tả ngắn"
              disabled={saving}
            />
          </div>

          <label
            htmlFor="menu-item-available"
            className="flex items-center gap-2 text-sm font-semibold text-ink"
          >
            <input
              id="menu-item-available"
              name="menuItemAvailable"
              autoComplete="off"
              type="checkbox"
              checked={isAvailable}
              onChange={(e) => setIsAvailable(e.target.checked)}
              className="h-4 w-4 accent-brand"
              disabled={saving}
            />
            Còn món
          </label>

          <OptionEditor
            menuItemId={menuItemId}
            groups={optionGroups}
            loading={optionGroupsLoading}
            onCreateGroup={(input) => onCreateGroup(menuItemId ?? '', input)}
            onUpdateGroup={(groupId, input) => onUpdateGroup(menuItemId ?? '', groupId, input)}
            onDeleteGroup={(groupId) => onDeleteGroup(menuItemId ?? '', groupId)}
            onCreateOption={(groupId, input) => onCreateOption(menuItemId ?? '', groupId, input)}
            onUpdateOption={(groupId, optionId, input) =>
              onUpdateOption(menuItemId ?? '', groupId, optionId, input)
            }
            onDeleteOption={(groupId, optionId) =>
              onDeleteOption(menuItemId ?? '', groupId, optionId)
            }
          />

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={saving || uploading || !hasCategories || !trimmedName}>
              {saving ? 'Đang lưu…' : 'Lưu món'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
