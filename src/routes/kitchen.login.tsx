import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { StaffLoginPage } from '@/pages/staff-login/StaffLoginPage'
import { loginStaff } from '@/shared/api/auth'

export const Route = createFileRoute('/kitchen/login')({
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
