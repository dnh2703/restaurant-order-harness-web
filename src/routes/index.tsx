import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold">Restaurant QR Ordering</h1>
      <p className="text-neutral-600">
        Khách quét mã QR ở bàn để mở thực đơn. Đường dẫn có dạng{' '}
        <code className="rounded bg-neutral-200 px-1.5 py-0.5 text-sm">/t/&lt;qrToken&gt;</code>.
      </p>
      <Link
        to="/t/$qrToken"
        params={{ qrToken: 'demo' }}
        search={{ q: '', cat: 'all' }}
        className="rounded-lg bg-orange-600 px-4 py-2 font-medium text-white hover:bg-orange-700"
      >
        Mở bàn demo
      </Link>
    </main>
  )
}
