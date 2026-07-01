import { createServerFn } from '@tanstack/react-start'
import { cookieTokenStore, doGetSession, doLogin, doLogout } from '@/shared/lib/staff-auth.server'
import type { StaffUser } from '@/entities/staff/model'

interface Credentials {
  email: string
  password: string
}

export const loginStaff = createServerFn({ method: 'POST' })
  .validator((d: Credentials) => d)
  .handler(({ data }): Promise<StaffUser> => doLogin(cookieTokenStore, data))

export const getStaffSession = createServerFn({ method: 'GET' }).handler(
  (): Promise<StaffUser | null> => doGetSession(cookieTokenStore),
)

export const logoutStaff = createServerFn({ method: 'POST' }).handler((): Promise<void> =>
  doLogout(cookieTokenStore),
)
