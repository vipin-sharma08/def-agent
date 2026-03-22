export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen px-8 py-12 max-w-4xl mx-auto animate-pulse">
      {/* Hero skeleton */}
      <div className="mb-14">
        <div className="h-6 w-48 rounded-full bg-elevated mb-6" />
        <div className="h-12 w-3/4 rounded-lg bg-elevated mb-3" />
        <div className="h-12 w-1/2 rounded-lg bg-elevated/60 mb-6" />
        <div className="h-5 w-2/3 rounded bg-elevated/60 mb-2" />
        <div className="h-5 w-1/2 rounded bg-elevated/40" />
      </div>

      {/* Upload zone skeleton */}
      <div className="mb-12 h-52 rounded-xl border border-dashed border-border bg-surface/50" />

      {/* Step cards skeleton */}
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-5 h-28" />
        ))}
      </div>
    </div>
  );
}
