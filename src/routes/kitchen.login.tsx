import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { StaffLoginPage } from '@/pages/staff-login'
import { getStaffSession, loginStaff } from '@/shared/api/auth'
import { kitchenLandingForRole } from './kitchen'

export const Route = createFileRoute('/kitchen/login')({
  // Already signed in? Skip the login form and go to the role's home. Every staff
  // role (KITCHEN, CASHIER, ADMIN) has a landing inside /kitchen, so no loop.
  beforeLoad: async () => {
    let session = null
    try {
      session = await getStaffSession()
    } catch {
      // Backend unreachable: just show the login form.
      return
    }
    if (session) {
      throw redirect({ to: kitchenLandingForRole(session.role) })
    }
  },
  component: KitchenLogin,
})

function KitchenLogin() {
  const navigate = useNavigate()
  return (
    <StaffLoginPage
      onSubmit={async (email, password) => {
        const user = await loginStaff({ data: { email, password } })
        await navigate({ to: kitchenLandingForRole(user.role) })
      }}
    />
  )
}
