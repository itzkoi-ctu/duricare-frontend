export default function OverviewSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Top Header skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-4 w-48 bg-border/60 rounded" />
          <div className="h-7 w-64 bg-border/80 rounded" />
          <div className="h-4 w-96 bg-border/50 rounded" />
        </div>
        <div className="h-10 w-44 bg-border/60 rounded-xl" />
      </div>

      {/* Top 4 KPI Cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((k) => (
          <div
            key={k}
            className="h-36 bg-surface border border-border rounded-2xl p-5 space-y-3 flex flex-col justify-between"
          >
            <div className="flex justify-between items-center">
              <div className="h-4 w-24 bg-border/70 rounded" />
              <div className="h-5 w-16 bg-border/50 rounded-full" />
            </div>
            <div className="h-6 w-32 bg-border/80 rounded" />
            <div className="h-3 w-full bg-border/40 rounded" />
          </div>
        ))}
      </div>

      {/* Zone Cards grid skeleton */}
      <div className="space-y-3">
        <div className="h-6 w-60 bg-border/70 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-surface border border-border rounded-2xl p-5 space-y-4"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="h-5 w-28 bg-border/70 rounded" />
                  <div className="h-3 w-40 bg-border/50 rounded" />
                </div>
                <div className="h-6 w-20 bg-border/60 rounded-full" />
              </div>

              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-bg border border-border/50">
                {[1, 2, 3].map((m) => (
                  <div key={m} className="p-2 bg-surface rounded-lg space-y-1.5 flex flex-col items-center">
                    <div className="h-3 w-10 bg-border/60 rounded" />
                    <div className="h-5 w-12 bg-border/80 rounded" />
                    <div className="h-3 w-14 bg-border/50 rounded" />
                  </div>
                ))}
              </div>

              <div className="h-8 w-full bg-border/40 rounded-lg" />
              <div className="h-10 w-full bg-border/60 rounded-xl" />
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Row skeleton (Forecast + Chat Slot) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 h-52 bg-surface border border-border rounded-2xl p-6 space-y-4">
          <div className="h-5 w-48 bg-border/70 rounded" />
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((c) => (
              <div key={c} className="h-16 bg-border/30 rounded-xl" />
            ))}
          </div>
          <div className="h-12 w-full bg-border/40 rounded-xl" />
        </div>
        <div className="lg:col-span-5 h-52 bg-surface border border-border rounded-2xl p-6 space-y-4">
          <div className="h-5 w-40 bg-border/70 rounded" />
          <div className="h-16 w-full bg-border/40 rounded-xl" />
          <div className="h-9 w-28 bg-border/60 rounded-xl self-end" />
        </div>
      </div>
    </div>
  );
}
