import { createFileRoute } from '@tanstack/react-router'
import { CustomerMenuPage } from '@/pages/customer-menu/CustomerMenuPage'
import { getMenu } from '@/shared/api/qr'
import { Route as QrTokenRoute } from './t.$qrToken'

export const Route = createFileRoute('/t/$qrToken/')({
  validateSearch: (search: Record<string, unknown>): { q: string; cat: string } => ({
    q: typeof search.q === 'string' ? search.q : '',
    cat: typeof search.cat === 'string' ? search.cat : 'all',
  }),
  loader: ({ params }) => getMenu({ data: { qrToken: params.qrToken } }),
  component: CustomerMenuRoute,
})

function CustomerMenuRoute() {
  const { context } = QrTokenRoute.useLoaderData()
  const menu = Route.useLoaderData()
  const params = Route.useParams()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const setSearch = (next: Partial<{ q: string; cat: string }>) =>
    navigate({ search: (prev) => ({ ...prev, ...next }), replace: true })
  const goToOrder = () =>
    navigate({
      to: '/t/$qrToken/order',
      params: { qrToken: params.qrToken },
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
