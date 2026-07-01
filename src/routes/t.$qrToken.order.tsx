// src/routes/t.$qrToken.order.tsx
import { createFileRoute, Link } from '@tanstack/react-router'
import { CustomerOrderPage } from '@/pages/customer-order'
import { Button } from '@/shared/ui'

export const Route = createFileRoute('/t/$qrToken/order')({
  component: OrderRoute,
})

function OrderRoute() {
  const { qrToken } = Route.useParams()
  return (
    <CustomerOrderPage
      qrToken={qrToken}
      backLink={
        <Link
          to="/t/$qrToken"
          params={{ qrToken }}
          search={{ q: '', cat: 'all' }}
          className="block"
        >
          <Button variant="secondary" fullWidth>
            Gọi thêm món
          </Button>
        </Link>
      }
    />
  )
}
