export type StaffRole = 'ADMIN' | 'KITCHEN' | 'CASHIER'

export interface StaffUser {
  id: string
  email: string
  name: string
  role: StaffRole
  restaurantId: string
}
