export default function Loading() {
  return (
    <div className="px-8 py-10 max-w-4xl mx-auto animate-pulse pb-28">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-8 w-8 rounded-xl bg-elevated" />
          <div className="h-3 w-20 rounded bg-elevated" />
        </div>
        <div className="h-8 w-80 rounded-lg bg-elevated mb-2" />
        <div className="h-3.5 w-2/3 rounded bg-elevated/60" />
      </div>

      {/* Section cards */}
      {Array.from({ length: 4 }).map((_, section) => (
        <div key={section} className="card p-6 mb-4 space-y-5">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <div className="h-7 w-7 rounded-lg bg-elevated" />
            <div className="h-4 w-40 rounded bg-elevated" />
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <div className="h-3 w-32 rounded bg-elevated mb-2" />
                <div className="h-8 w-full rounded-lg bg-elevated" />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Footer skeleton */}
      <div className="fixed bottom-0 left-64 right-0 border-t border-border bg-base/95 px-8 py-3.5 flex items-center justify-between">
        <div className="flex gap-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="text-center">
              <div className="h-2.5 w-14 rounded bg-elevated mb-1.5" />
              <div className="h-4 w-12 rounded bg-elevated" />
            </div>
          ))}
        </div>
        <div className="h-10 w-48 rounded-xl bg-elevated" />
      </div>
    </div>
  );
}
