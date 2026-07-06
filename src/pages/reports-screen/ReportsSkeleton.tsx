import { Skeleton } from '@/shared/ui'

const sectionHeading = 'mb-2 text-sm font-extrabold uppercase tracking-wide text-secondary'
const card = 'rounded-card border border-line-strong bg-white shadow-card'

/** Loading placeholder that mirrors the reports layout: summary tiles, chart, top-dishes table. */
export function ReportsSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`${card} p-4`}>
            {/* Heights match RevenueSummary: label text-xs (16px) + mt-1 + value text-2xl (32px),
                so the tile does not resize when real data replaces the skeleton. */}
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-1 h-8 w-32" />
          </div>
        ))}
      </div>

      <section>
        <h2 className={sectionHeading}>Doanh thu theo ngày</h2>
        <div className={`${card} p-4`}>
          <Skeleton className="h-64 w-full" />
        </div>
      </section>

      <section>
        <h2 className={sectionHeading}>Món bán chạy</h2>
        <div className={`${card} overflow-hidden`}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 border-b border-line px-5 py-4 last:border-b-0"
            >
              <Skeleton className="h-4 w-6" />
              <Skeleton className="h-4 w-40 max-w-full flex-1" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
