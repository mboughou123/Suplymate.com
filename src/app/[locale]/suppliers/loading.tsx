// Mirrors the suppliers page: navy hero with title, stat row and search, then a
// card grid. Matching the real geometry keeps the layout from shifting when the
// data arrives.
export default function SuppliersLoading() {
  return (
    <div className="min-h-screen bg-transparent" aria-busy="true">
      <div className="bg-gradient-to-br from-navy-dark to-navy py-14 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="h-10 w-80 max-w-full animate-pulse rounded-lg bg-white/15" />
          <div className="mt-3 h-5 w-full max-w-2xl animate-pulse rounded bg-white/10" />
          <div className="mt-6 flex gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-12 w-24 animate-pulse rounded-lg bg-white/10"
              />
            ))}
          </div>
          <div className="mt-6 h-12 w-full max-w-xl animate-pulse rounded-xl bg-white/15" />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="h-56 animate-pulse rounded-2xl border border-line bg-surface"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
