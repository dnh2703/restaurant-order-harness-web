# Dish image upload — FE integration (US-021, issue #12)

## Goal

Let admins upload a dish image from their machine in the dish create/edit form, instead
of only pasting an external URL. The backend endpoint `POST /api/menu-items/image`
(multipart, ADMIN, returns `{ data: { url } }`) is already implemented.

## Key architectural decision — go through a server function, not a browser fetch

The issue's example uploads directly from the browser with `Authorization: Bearer <token>`.
**That cannot work in this app.** Staff auth tokens live in **httpOnly cookies**
(`staff_at`/`staff_rt`) that JavaScript cannot read; every backend call is proxied through a
TanStack Start **server function** (`createServerFn` → `authedFetch` server-side). We follow
that same pattern for the upload.

Consequence: the browser only ever calls our own origin's server function, so the
**backend CORS gap flagged in the issue does not block this work** — there is no
cross-origin browser→backend call.

## Components

1. **`src/widgets/menu-admin-form/image-upload.ts`** — pure, framework-free helpers:
   - `ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']`
   - `MAX_IMAGE_BYTES = 5 * 1024 * 1024`
   - `validateImageFile(file: File): string | null` — returns a Vietnamese error message
     mirroring the server rules, or `null` when valid. Used for client-side pre-validation.

2. **`src/shared/api/menu-admin.server.ts`** (server-only):
   - `uploadMenuItemImage(store, file): Promise<string>` — builds `FormData`, appends `file`,
     `authedFetch`-POSTs to `/api/menu-items/image` (no manual `Content-Type` — undici sets the
     multipart boundary), reads `data.url` on `201`.
   - Extend `mapMenuAdminErrorCode` with `IMAGE_MISSING`, `IMAGE_TYPE_UNSUPPORTED`,
     `IMAGE_TOO_LARGE`, `STORAGE_UNAVAILABLE` → Vietnamese copy. Reuses the existing
     `readError` → `MenuAdminApiError` path (`UNAUTHORIZED`/`FORBIDDEN` already mapped).

3. **`src/shared/api/menu-admin.ts`** — `uploadMenuItemImage` server function:
   - `createServerFn({ method: 'POST' })` with a `FormData` validator; extracts `file` and calls
     the server helper. TanStack Start 1.168 serializes `FormData` as multipart automatically.

4. **`src/widgets/menu-admin-form/MenuItemDialog.tsx`** — new `onUploadImage: (file: File) =>
   Promise<string>` prop; UI = **upload primary, URL fallback collapsible**:
   - "Chọn ảnh từ máy" file input (`accept="image/jpeg,image/png,image/webp"`).
   - On select: client-validate; if invalid show inline error and stop. If valid, set
     `uploading` (disables Save + inputs), call `onUploadImage`, on success set `imageUrl` to the
     returned URL and show the preview; on failure show the mapped `err.message` inline.
   - Preview (reuses existing `<img>`); "Đổi ảnh khác" re-opens the picker.
   - "Dán link ảnh ngoài" toggle reveals the existing URL text input (fallback). Pasting a URL
     still populates `imageUrl` and previews.
   - Save button disabled while `uploading`.

5. **`src/pages/kitchen-menu/KitchenMenuPage.tsx`** — wire `onUploadImage` to build a `FormData`,
   call the `uploadMenuItemImage` server function, return the URL; toast on error via existing
   `toastApiError`.

## Data flow

`file input → validateImageFile → onUploadImage(file) → uploadMenuItemImage server fn →
uploadMenuItemImage(store,file) → authedFetch multipart → BE 201 {data.url} → setImageUrl →
preview`. Save then sends `imageUrl` in the normal create/update payload — unchanged.

## Error handling

Client pre-validation blocks bad type/size before any network call. Server maps every documented
`code` to Vietnamese copy inside `MenuAdminApiError`; the message serializes across the server-fn
boundary and is shown inline in the dialog (and toasted by the page). `STORAGE_UNAVAILABLE`
message invites retry.

## Testing

- `image-upload.test.ts` — accepts valid jpeg/png/webp ≤5MB; rejects wrong type and >5MB with
  the right messages.
- `menu-admin.test.ts` — `uploadMenuItemImage` posts multipart to the right path and returns the
  URL; maps an image error code to a `MenuAdminApiError`.
- `MenuItemDialog.test.tsx` — valid file triggers `onUploadImage`, preview shows returned URL,
  Save disabled while uploading; invalid file shows inline error and skips upload; URL fallback
  toggle still works. Existing tests updated for the relabeled URL field.

## Out of scope / YAGNI

No drag-and-drop, no image cropping/compression, no progress bar (small files, single request),
no multi-image galleries. Backend CORS is tracked on the server repo and does not gate this FE.
