export default function Loading() {
  return (
    <div className="px-8 py-10 max-w-7xl mx-auto animate-pulse">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-md bg-elevated" />
              <div className="h-4 w-24 rounded bg-elevated" />
            </div>
            <div className="h-9 w-64 rounded-lg bg-elevated mb-2" />
            <div className="h-4 w-80 rounded bg-elevated/60" />
          </div>
          {/* Export button skeleton */}
          <div className="h-10 w-32 rounded-md bg-elevated" />
        </div>
      </div>

      {/* Valuation summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-5">
            <div className="h-3.5 w-24 rounded bg-elevated mb-3" />
            <div className="h-8 w-32 rounded bg-elevated mb-1.5" />
            <div className="h-3 w-20 rounded bg-elevated/60" />
          </div>
        ))}
      </div>

      {/* Tab bar skeleton */}
      <div className="flex gap-1 border-b border-border mb-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="px-5 py-2.5">
            <div className="h-4 w-24 rounded bg-elevated" />
          </div>
        ))}
      </div>

      {/* Main content area skeleton */}
      <div className="card rounded-tl-none p-6">
        {/* Chart placeholder */}
        <div className="h-64 w-full rounded-lg bg-elevated/40 mb-6" />
        {/* Table rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-4 py-3 border-b border-border/40">
            <div className="h-3.5 w-44 rounded bg-elevated" />
            <div className="ml-auto flex gap-8">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="h-3.5 w-20 rounded bg-elevated" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
