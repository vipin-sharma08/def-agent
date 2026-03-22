export default function Loading() {
  return (
    <div className="px-8 py-10 max-w-6xl mx-auto animate-pulse">
      {/* Header skeleton */}
      <div className="mb-7">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-8 w-8 rounded-xl bg-elevated" />
          <div className="h-3 w-20 rounded bg-elevated" />
        </div>
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="h-8 w-72 rounded-lg bg-elevated mb-2" />
            <div className="h-3.5 w-96 rounded bg-elevated/60" />
          </div>
          <div className="h-16 w-44 rounded-xl bg-elevated shrink-0" />
        </div>
      </div>

      {/* Tab bar skeleton */}
      <div className="flex gap-0.5 border-b border-border mb-0">
        {["Income Statement", "Balance Sheet", "Cash Flow"].map((label) => (
          <div key={label} className="px-5 py-2.5">
            <div className="h-3.5 w-28 rounded bg-elevated" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="border border-border border-t-0 rounded-b-xl overflow-hidden">
        {/* Table header */}
        <div className="flex gap-4 px-4 py-3 border-b border-border-strong bg-surface">
          <div className="h-3 w-20 rounded bg-elevated" />
          <div className="ml-auto flex gap-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-3 w-20 rounded bg-elevated" />
            ))}
          </div>
        </div>
        {/* Table rows */}
        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={i}
            className={`flex gap-4 px-4 py-[9px] border-b border-border/40 ${
              i % 5 === 0 ? "bg-elevated/40" : i % 2 === 0 ? "bg-base" : "bg-surface/50"
            }`}
          >
            <div
              className="h-3 rounded bg-elevated"
              style={{ width: `${120 + (i % 4) * 35}px` }}
            />
            <div className="ml-auto flex gap-8">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="h-3 w-20 rounded bg-elevated" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
