import { LockIcon, UserIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { Button, Input } from '@/shared/ui'

interface Props {
  onSubmit: (email: string, password: string) => Promise<void>
}

const fieldInputClass =
  'h-11 border border-line-strong bg-white px-3 shadow-none focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20'

export function StaffLoginPage({ onSubmit }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await onSubmit(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-md rounded-card bg-white px-8 py-10 shadow-card">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-brand">Đăng nhập</h1>
        </header>

        <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-1.5">
            <span id="staff-email-label" className="text-sm font-semibold text-ink-soft">
              Email
            </span>
            <Input
              type="text"
              placeholder="admin@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              aria-labelledby="staff-email-label"
              leadingIcon={<UserIcon size={18} />}
              containerClassName={fieldInputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span id="staff-password-label" className="text-sm font-semibold text-ink-soft">
              Mật khẩu
            </span>
            <Input
              type="password"
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              aria-labelledby="staff-password-label"
              leadingIcon={<LockIcon size={18} />}
              containerClassName={fieldInputClass}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button
            type="submit"
            fullWidth
            disabled={busy}
            size="lg"
            className="flex items-center justify-center gap-2 rounded-full bg-brand py-3.5 hover:bg-brand/90"
          >
            {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </Button>
        </form>
      </div>
    </main>
  )
}
