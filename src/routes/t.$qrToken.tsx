import { createFileRoute, Link } from '@tanstack/react-router'
import { getMenu, getTableContext } from '@/shared/api/qr'
import { CustomerMenuPage } from '@/pages/customer-menu/CustomerMenuPage'

export const Route = createFileRoute('/t/$qrToken')({
  validateSearch: (search: Record<string, unknown>): { q: string; cat: string } => ({
    q: typeof search.q === 'string' ? search.q : '',
    cat: typeof search.cat === 'string' ? search.cat : 'all',
  }),
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
  const params = Route.useParams()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const setSearch = (next: Partial<{ q: string; cat: string }>) =>
    navigate({ search: (prev) => ({ ...prev, ...next }), replace: true })
  const goToOrder = () =>
    navigate({
      to: '/t/$qrToken/order',
      params: { qrToken: params.qrToken },
      search: { q: '', cat: 'all' },
    })
  return (
    <CustomerMenuPage
      context={context}
      menu={menu}
      search={search}
      onSearchChange={setSearch}
      qrToken={params.qrToken}
      onViewOrder={goToOrder}
      onSubmitted={goToOrder}
    />
  )
}
