import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { StaffLoginPage } from '@/pages/staff-login/StaffLoginPage'
import { getStaffSession, loginStaff } from '@/shared/api/auth'

export const Route = createFileRoute('/kitchen/login')({
  // Already signed in as kitchen staff? Skip the login form and go to the board.
  // Only redirect KITCHEN/ADMIN (the roles /kitchen allows) so a CASHIER session
  // doesn't bounce login -> /kitchen -> (guard rejects) -> login in a loop.
  beforeLoad: async () => {
    let session = null
    try {
      session = await getStaffSession()
    } catch {
      // Backend unreachable: just show the login form.
      return
    }
    if (session && (session.role === 'KITCHEN' || session.role === 'ADMIN')) {
      throw redirect({ to: '/kitchen' })
    }
  },
  component: KitchenLogin,
})

function KitchenLogin() {
  const navigate = useNavigate()
  return (
    <StaffLoginPage
      onSubmit={async (email, password) => {
        await loginStaff({ data: { email, password } })
        await navigate({ to: '/kitchen' })
      }}
    />
  )
}
