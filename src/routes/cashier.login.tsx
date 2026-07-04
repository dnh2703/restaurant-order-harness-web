import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { StaffLoginPage } from '@/pages/staff-login'
import { getStaffSession, loginStaff } from '@/shared/api/auth'

export const Route = createFileRoute('/cashier/login')({
  // Already signed in as cashier staff? Skip the login form and go to the register.
  // Only redirect CASHIER/ADMIN (the roles /cashier allows) so a KITCHEN session
  // doesn't bounce login -> /cashier -> (guard rejects) -> login in a loop.
  beforeLoad: async () => {
    let session = null
    try {
      session = await getStaffSession()
    } catch {
      // Backend unreachable: just show the login form.
      return
    }
    if (session && (session.role === 'CASHIER' || session.role === 'ADMIN')) {
      throw redirect({ to: '/cashier' })
    }
  },
  component: CashierLogin,
})

function CashierLogin() {
  const navigate = useNavigate()
  return (
    <StaffLoginPage
      onSubmit={async (email, password) => {
        await loginStaff({ data: { email, password } })
        await navigate({ to: '/cashier' })
      }}
    />
  )
}
