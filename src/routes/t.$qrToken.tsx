import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { getTableContext } from '@/shared/api/qr'

export const Route = createFileRoute('/t/$qrToken')({
  // Layout loader: only resolve the table session/context, which validates the
  // QR token (the errorComponent below) and is shared by every child route.
  // The menu is loaded by the index route so the order page doesn't fetch it.
  loader: async ({ params }) => {
    const context = await getTableContext({ data: { qrToken: params.qrToken } })
    return { context }
  },
  errorComponent: ({ error }) => (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-xl font-bold text-red-600">Bàn không hợp lệ</h1>
      <p className="text-neutral-600">{error.message}</p>
      <Link to="/" className="text-orange-600 underline">
        Về trang chủ
      </Link>
    </main>
  ),
  component: QrTokenLayout,
})

function QrTokenLayout() {
  return <Outlet />
}
