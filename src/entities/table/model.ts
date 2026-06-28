// Table session domain types (mirrors GET /api/qr/{qrToken} response `data`).

export interface Restaurant {
  name: string
}

export interface TableInfo {
  id: string
  name: string
  status: 'EMPTY' | 'OCCUPIED'
}

export interface TableSession {
  orderId: string
  status: 'OPEN'
  openedAt: string
}

export interface TableContext {
  restaurant: Restaurant
  table: TableInfo
  session: TableSession
}
