export type TableStatus = 'EMPTY' | 'OCCUPIED'

export interface AdminTableView {
  id: string
  name: string
  capacity: number | null
  qrToken: string
  status: TableStatus
}
