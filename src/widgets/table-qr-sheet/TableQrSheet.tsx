import { useCallback, useEffect, useId, useRef, useState } from 'react'
import QRCode from 'qrcode'
import type { AdminTableView } from '@/shared/api/types/admin-table'
import { buildTableQrUrl } from '@/shared/lib/table-qr-url'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui'

interface Props {
  table: AdminTableView | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRegenerated: (table: AdminTableView) => void
  onRegenerate: (id: string) => Promise<AdminTableView>
}

export function TableQrSheet({ table, open, onOpenChange, onRegenerated, onRegenerate }: Props) {
  const printId = useId().replace(/:/g, '')
  const printRef = useRef<HTMLDivElement>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copyOk, setCopyOk] = useState(false)

  const url =
    table && typeof window !== 'undefined'
      ? buildTableQrUrl(window.location.origin, table.qrToken)
      : ''

  useEffect(() => {
    if (!open || !url) {
      setQrDataUrl(null)
      return
    }
    let cancelled = false
    QRCode.toDataURL(url, { errorCorrectionLevel: 'M', margin: 2, width: 256 })
      .then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl)
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [open, url])

  const onCopy = useCallback(async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopyOk(true)
      window.setTimeout(() => setCopyOk(false), 2000)
    } catch {
      setCopyOk(false)
    }
  }, [url])

  const onDownload = useCallback(() => {
    if (!qrDataUrl || !table) return
    const a = document.createElement('a')
    a.href = qrDataUrl
    a.download = `ban-${table.name.replace(/\s+/g, '-').toLowerCase()}.png`
    a.click()
  }, [qrDataUrl, table])

  const onPrint = useCallback(() => {
    window.print()
  }, [])

  const onRegenerateClick = useCallback(async () => {
    if (!table) return
    if (
      !window.confirm(
        'Tạo lại mã QR sẽ vô hiệu hóa mã cũ ngay lập tức. Khách không quét được mã cũ nữa. Tiếp tục?',
      )
    ) {
      return
    }
    setBusy(true)
    try {
      const next = await onRegenerate(table.id)
      onRegenerated(next)
    } finally {
      setBusy(false)
    }
  }, [table, onRegenerate, onRegenerated])

  if (!table) return null

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #${printId}, #${printId} * { visibility: visible !important; }
          #${printId} {
            position: fixed;
            inset: 0;
            display: flex !important;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 1rem;
            padding: 2rem;
            background: white;
          }
        }
      `}</style>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="no-print sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Mã QR — {table.name}</DialogTitle>
            <DialogDescription>
              Khách quét mã này để mở thực đơn tại bàn. In và dán lên bàn.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`Mã QR ${table.name}`}
                className="size-64 rounded-card border border-line bg-white p-2"
              />
            ) : (
              <div className="flex size-64 items-center justify-center rounded-card border border-dashed border-line text-sm text-muted">
                Đang tạo mã…
              </div>
            )}
            <p className="max-w-full break-all text-center text-xs text-muted">{url}</p>
          </div>

          <DialogFooter className="flex-row flex-wrap justify-center gap-2 sm:justify-center">
            <Button type="button" variant="secondary" size="sm" onClick={onCopy}>
              {copyOk ? 'Đã sao chép' : 'Sao chép link'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onDownload}
              disabled={!qrDataUrl}
            >
              Tải PNG
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onPrint}
              disabled={!qrDataUrl}
            >
              In mã
            </Button>
            <Button type="button" size="sm" onClick={onRegenerateClick} disabled={busy}>
              {busy ? 'Đang tạo lại…' : 'Tạo lại mã'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div id={printId} ref={printRef} className="hidden print:flex">
        {qrDataUrl && (
          <>
            <img src={qrDataUrl} alt="" className="size-72" />
            <p className="text-xl font-bold">{table.name}</p>
            <p className="text-sm">{url}</p>
          </>
        )}
      </div>
    </>
  )
}
