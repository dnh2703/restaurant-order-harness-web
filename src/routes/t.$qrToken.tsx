import { createFileRoute, Link } from '@tanstack/react-router'
import { getMenu, getTableContext } from '@/shared/api/qr'
import { CustomerMenuPage } from '@/pages/customer-menu/CustomerMenuPage'

export const Route = createFileRoute('/t/$qrToken')({
  loader: async ({ params }) => {
    const [context, menu] = await Promise.all([
      getTableContext({ data: { qrToken: params.qrToken } }),
      getMenu({ data: { qrToken: params.qrToken } }),
    ])
    return { context, menu }
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
  component: CustomerMenuRoute,
})

function CustomerMenuRoute() {
  const { context, menu } = Route.useLoaderData()
  return <CustomerMenuPage context={context} menu={menu} />
}
