import { useCallback, useEffect, useState } from 'react'
import { CashierTableList } from '@/widgets/cashier-table-list'
import { CashierBillPanel } from '@/widgets/cashier-bill-panel'
import { InvoiceReceipt } from '@/widgets/invoice-receipt'
import { useOpenTables } from '@/entities/cashier'
import type { BillDetail, DiscountType, PaymentMethod } from '@/entities/cashier'
import type { StaffUser } from '@/entities/staff'
import { Button } from '@/shared/ui'
import { getBillDetail, applyOrderDiscount, payOrder } from '@/shared/api/cashier'

interface Props {
  user: StaffUser
  onLogout: () => void
}

interface PaidInvoice {
  bill: BillDetail
  tableName: string
  method: PaymentMethod
}

export function CashierScreenPage({ user, onLogout }: Props) {
  const { tables, refetch } = useOpenTables(user.restaurantId)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [bill, setBill] = useState<BillDetail | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paid, setPaid] = useState<PaidInvoice | null>(null)

  const loadBill = useCallback(async (orderId: string) => {
    try {
      setBill(await getBillDetail({ data: { id: orderId } }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được hóa đơn')
    }
  }, [])

  // Refetch the selected bill when the live table list changes (SSE / polling).
  useEffect(() => {
    if (selectedOrderId && tables.some((t) => t.orderId === selectedOrderId)) {
      void loadBill(selectedOrderId)
    }
  }, [tables, selectedOrderId, loadBill])

  function selectTable(orderId: string) {
    setError(null)
    setSelectedOrderId(orderId)
    setBill(null)
    void loadBill(orderId)
  }

  async function handleDiscount(input: { type: DiscountType; value: number; reason: string }) {
    if (!selectedOrderId) return
    setBusy(true)
    setError(null)
    try {
      await applyOrderDiscount({ data: { id: selectedOrderId, ...input } })
      await loadBill(selectedOrderId)
      refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không áp dụng được giảm giá')
    } finally {
      setBusy(false)
    }
  }

  async function handlePay(method: PaymentMethod) {
    if (!selectedOrderId || !bill) return
    const tableName = tables.find((t) => t.orderId === selectedOrderId)?.tableName ?? ''
    setBusy(true)
    setError(null)
    try {
      await payOrder({ data: { id: selectedOrderId, method } })
      setPaid({ bill, tableName, method })
      setSelectedOrderId(null)
      setBill(null)
      refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thanh toán được')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <h1 className="text-lg font-bold text-brand">Thu ngân</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">{user.name}</span>
          <Button type="button" variant="secondary" size="sm" onClick={onLogout}>
            Đăng xuất
          </Button>
        </div>
      </header>

      {error && <p className="bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(220px,320px)_1fr]">
        <aside className="min-h-0 overflow-y-auto border-r border-line bg-canvas">
          <CashierTableList
            tables={tables}
            selectedOrderId={selectedOrderId}
            onSelect={selectTable}
          />
        </aside>
        <section className="min-h-0 overflow-y-auto">
          <CashierBillPanel
            bill={bill}
            busy={busy}
            onApplyDiscount={handleDiscount}
            onPay={handlePay}
          />
        </section>
      </div>

      {paid && (
        <InvoiceReceipt
          bill={paid.bill}
          tableName={paid.tableName}
          method={paid.method}
          onClose={() => setPaid(null)}
        />
      )}
    </div>
  )
}
